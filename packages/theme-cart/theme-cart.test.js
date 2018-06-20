require('es6-promise').polyfill();
require('isomorphic-fetch');

const cart = require('./theme-cart');
const fetchMock = require('fetch-mock');

// For now, we need these settings to ensure Fetch works correctly with Shopify Cart API
// https://github.com/Shopify/shopify/issues/94144
const fetchAPISettings = {
  credentials: 'same-origin',
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
};

describe('getState()', () => {
  const body = require('./__fixtures__/cart-empty.json');

  beforeEach(() => {
    fetchMock.mock('/cart.js', { body });
  });

  afterEach(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.getState().then).toBeDefined();
  });

  test('fulfills with the state object of the cart', async () => {
    const spy = jest.spyOn(global, 'fetch');

    const state = await cart.getState();

    expect(state).toMatchObject(body);
    expect(spy).toHaveBeenLastCalledWith(
      '/cart.js',
      expect.objectContaining(fetchAPISettings)
    );
  });
});

describe('getLineItemIndex()', () => {
  const body = require('./__fixtures__/cart-populated.json');

  beforeEach(() => {
    fetchMock.mock('/cart.js', { body });
  });

  afterEach(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.getLineItemIndex('383838383:282hd82hd').then).toBeDefined();
  });

  test('rejects if first argument is not a line item key', async () => {
    await expect(cart.getLineItemIndex()).rejects.toThrowError(TypeError);

    await expect(cart.getLineItemIndex(123456)).rejects.toThrowError(TypeError);

    await expect(cart.getLineItemIndex('123456')).rejects.toThrowError(
      TypeError
    );
  });

  test('rejects with if line item is not found', async () => {
    await expect(cart.getLineItemIndex('123456:123456')).rejects.toThrowError();
  });

  test('fulfills with the line item index if found', async () => {
    const index = 0;
    const key = body.items[index].key;

    await expect(cart.getLineItemIndex(key)).resolves.toBe(0);
  });
});

describe('getLineItem()', () => {
  const body = require('./__fixtures__/cart-populated.json');

  beforeEach(() => {
    fetchMock.mock('/cart.js', { body });
  });

  afterEach(fetchMock.restore);

  test('throws an error if first argument is not a line item key', () => {
    expect(() => cart.getLineItem()).toThrowError(TypeError);
    expect(() => cart.getLineItem(123456)).toThrowError(TypeError);
    expect(() => cart.getLineItem('123456')).toThrowError(TypeError);
  });

  test('returns a promise', () => {
    expect(cart.getLineItem('123456:123456').then).toBeDefined();
  });

  test('fulfills with line item object if a match is found', async () => {
    const key = body.items[0].key;
    const item = await expect(cart.getLineItem(key)).resolves.toMatchObject(
      body.items[0]
    );
  });

  test('fulfills with null if no items match the item key', async () => {
    await expect(cart.getLineItem('noMatch:something')).resolves.toBeNull();
  });
});

describe('addLineItem()', () => {
  const body = require('./__fixtures__/cart-populated.json');

  beforeEach(() => {
    fetchMock.mock('/cart/add.js', body.items[0]);
  });

  afterEach(fetchMock.restore);

  test('throws an error if first argument is not a variantId number', () => {
    expect(() => cart.addLineItem(123456)).not.toThrowError();
    expect(() => cart.addLineItem()).toThrowError(TypeError);
    expect(() => cart.addLineItem('123456:123456')).toThrowError(TypeError);
    expect(() => cart.addLineItem('123456')).toThrowError(TypeError);
  });

  test('optional second argument is an object with a `quantity` key', async () => {
    const spy = jest.spyOn(global, 'fetch');
    const item = require('./__fixtures__/cart-populated.json').items[0];
    const id = item.id;
    const quantity = 20;
    const options = { quantity };

    await cart.addLineItem(id, options);

    expect(spy).toHaveBeenLastCalledWith(
      '/cart/add.js',
      expect.objectContaining({ body: { id, ...options } })
    );
  });

  test('optional second argument is an object with a `properties` key', async () => {
    const spy = jest.spyOn(global, 'fetch');
    const item = require('./__fixtures__/cart-populated.json').items[0];
    const id = item.id;
    const properties = {
      someKey: 'someValue'
    };
    const options = { properties };

    await cart.addLineItem(id, options);

    expect(spy).toHaveBeenLastCalledWith(
      '/cart/add.js',
      expect.objectContaining({ body: { id, ...options } })
    );
  });

  test('returns a promise', () => {
    expect(cart.addLineItem(123456).then).toBeDefined();
  });

  test('fulfills with the line item which was added to the cart', async () => {
    const item = require('./__fixtures__/cart-populated.json').items[0];
    const id = item.id;

    await expect(cart.addLineItem(id)).resolves.toMatchObject(item);
  });
});

describe('changeLineItem()', () => {
  const populatedState = require('./__fixtures__/cart-populated.json');

  beforeAll(() => {
    fetchMock.mock('/cart.js', populatedState);
    fetchMock.mock('/cart/change.js', (url, options) => {
      const line = options.body.line;
      const item = populatedState.items[line];
      const quantity = options.body.quantity || item.quantity;
      const properties = options.body.properties || item.properties;

      return Object.assign(item, { quantity, properties });
    });
  });

  afterAll(fetchMock.restore);

  test('returns a promise', async () => {
    expect(
      cart.changeLineItem(populatedState.items[0].key, {
        properties: { someKey: 'someValue' }
      }).then
    ).toBeDefined();
  });

  test('rejects if first argument is not a line item key', async () => {
    await expect(
      cart.changeLineItem(123456, { quantity: 2 })
    ).rejects.toThrowError();
    await expect(
      cart.changeLineItem('123456', { quantity: 2 })
    ).rejects.toThrowError();
  });

  test('rejects if the second argument is not an object which contains a `quantity` or `properties` key', async () => {
    await expect(cart.changeLineItem('123456:123456')).rejects.toThrowError();
    await expect(
      cart.changeLineItem('123456:123456', {})
    ).rejects.toThrowError();
  });

  test('fulfills with the line item object that was changed', async () => {
    const item = require('./__fixtures__/cart-populated.json').items[0];
    const quantity = 2;
    const newItem = Object.assign(item, { quantity });
    await expect(
      cart.changeLineItem(item.key, { quantity: 2 })
    ).resolves.toMatchObject(newItem);
  });

  test('makes a request to the `cart/change.js` endpoint using the line number as an identifier', async () => {
    const spyFetch = jest.spyOn(global, 'fetch');
    const item = require('./__fixtures__/cart-populated.json').items[0];

    await cart.changeLineItem(item.key, { quantity: 2 });

    expect(spyFetch).toHaveBeenLastCalledWith(
      '/cart/change.js',
      expect.objectContaining({ body: { line: 0, quantity: 2 } })
    );
  });
});

describe('removeLineItem()', () => {
  const populatedState = require('./__fixtures__/cart-populated.json');

  beforeAll(() => {
    fetchMock.mock('/cart.js', populatedState);
    fetchMock.mock('/cart/change.js', (url, options) => {
      const line = options.body.line;
      const item = populatedState.items[line];
      const quantity = options.body.quantity || item.quantity;
      const properties = options.body.properties || item.properties;

      return Object.assign(item, { quantity, properties });
    });
  });

  afterAll(fetchMock.restore);

  test('returns a promise', async () => {
    expect(
      cart.removeLineItem(populatedState.items[0].key, {
        properties: { someKey: 'someValue' }
      }).then
    ).toBeDefined();
  });

  test('rejects if first argument is not a line item key', async () => {
    await expect(cart.removeLineItem(123456)).rejects.toThrowError();
    await expect(cart.removeLineItem('123456')).rejects.toThrowError();
  });

  test('fulfills with the line item object that was changed', async () => {
    const item = require('./__fixtures__/cart-populated.json').items[0];
    const quantity = 0;
    const newItem = Object.assign(item, { quantity });
    await expect(cart.removeLineItem(item.key)).resolves.toMatchObject(newItem);
  });

  test('makes a request to the `cart/change.js` endpoint using the line number as an identifier', async () => {
    const spyFetch = jest.spyOn(global, 'fetch');
    const item = require('./__fixtures__/cart-populated.json').items[0];

    await cart.removeLineItem(item.key);

    expect(spyFetch).toHaveBeenLastCalledWith(
      '/cart/change.js',
      expect.objectContaining({ body: { line: 0, quantity: 0 } })
    );
  });
});

describe('clearLineItems()', () => {
  const body = require('./__fixtures__/cart-empty.json');

  beforeEach(() => {
    fetchMock.mock('/cart/clear.js', { body });
  });

  afterEach(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.clearLineItems().then).toBeDefined();
  });

  test('clears the line items from the cart state object', async () => {
    const spy = jest.spyOn(global, 'fetch');

    await cart.clearLineItems();

    expect(spy).toHaveBeenLastCalledWith(
      '/cart/clear.js',
      expect.objectContaining(fetchAPISettings)
    );
  });

  test('resolves with the state object of the cart', async () => {
    const state = await cart.clearLineItems();
    expect(state).toMatchObject(body);
  });
});

describe('getAttributes()', () => {
  const populatedState = require('./__fixtures__/cart-populated.json');

  beforeEach(() => {
    fetchMock.mock('/cart.js', { body: populatedState });
  });

  afterEach(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.getAttributes().then).toBeDefined();
  });

  test('fulfills with the attributes object of the cart state object', () => {
    expect(cart.getAttributes()).resolves.toMatchObject(
      populatedState.attributes
    );
  });
});

describe('setAttributes()', () => {
  const populatedState = require('./__fixtures__/cart-populated.json');

  beforeAll(() => {
    fetchMock.mock('/cart/update.js', (url, options) => {
      return Object.assign(populatedState, {
        attributes: options.body.attributes
      });
    });
  });

  afterAll(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.setAttributes).toBeDefined();
    expect(cart.setAttributes().then).toBeDefined();
  });

  test('fulfills with the cart state object', async () => {
    const attributes = { someKey: 'someValue' };
    const returned = await cart.setAttributes(attributes);

    expect(returned).toMatchObject(populatedState);
    expect(returned.attributes).toMatchObject(attributes);
  });
});

describe('clearAttributes()', () => {
  const populatedState = require('./__fixtures__/cart-populated.json');

  beforeAll(() => {
    fetchMock.mock('/cart/update.js', () => populatedState);
  });

  afterAll(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.clearAttributes).toBeDefined();
    expect(cart.clearAttributes().then).toBeDefined();
  });

  test('fulfills with the cart state object', async () => {
    await expect(cart.clearAttributes()).resolves.toMatchObject(populatedState);
  });
});

describe('getNote()', () => {
  const populatedState = require('./__fixtures__/cart-populated.json');

  beforeAll(() => {
    fetchMock.mock('/cart.js', { body: populatedState });
  });

  afterAll(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.getNote).toBeDefined();
    expect(cart.getNote().then).toBeDefined();
  });
  test('resolves with the note value in the cart state object', async () => {
    await expect(cart.getNote()).resolves.toBe(populatedState.note);
  });
});

describe('setNote()', () => {
  const populatedState = require('./__fixtures__/cart-populated.json');

  beforeAll(() => {
    fetchMock.mock('/cart/update.js', () => (url, options) => {
      return Object.assign(populatedState, { note: options.body.note });
    });
  });

  afterAll(fetchMock.restore);
  test('returns a promise', () => {
    expect(cart.setNote).toBeDefined();
    expect(cart.setNote('').then).toBeDefined();
  });

  test('resolves with the updated note value in the cart state object', async () => {
    const value = 'New note value';
    await expect(cart.setNote(value)).resolves.toBe(value);
  });
});

describe('clearNote()', () => {
  const populatedState = require('./__fixtures__/cart-populated.json');

  beforeAll(() => {
    fetchMock.mock('/cart/update.js', () => (url, options) => {
      return Object.assign(populatedState, { note: options.body.note });
    });
  });
  afterAll(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.clearNote).toBeDefined();
    expect(cart.clearNote().then).toBeDefined();
  });

  test('resolves with the cleared note value in the cart state object', async () => {
    await expect(cart.clearNote()).resolves.toBe(null);
  });
});

describe('getShippingRates()', () => {
  const shippingRates = require('./__fixtures__/shipping-rates.json');

  beforeAll(() => {
    fetchMock.mock('/cart/shipping_rates.json', shippingRates);
  });
  afterAll(fetchMock.restore);

  test('returns a promise', () => {
    expect(cart.getShippingRates).toBeDefined();
    expect(cart.getShippingRates().then).toBeDefined();
  });

  test('resolves with an array of shipping rate objects', () => {
    expect(cart.getShippingRates()).resolves.toMatchObject(shippingRates);
  });
});
