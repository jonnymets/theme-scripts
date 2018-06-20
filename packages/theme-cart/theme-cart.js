/**
 * Cart Template Script
 * ------------------------------------------------------------------------------
 * A file that contains scripts highly couple code to the Cart template.
 *
 * @namespace cart
 */

function applySettings(config) {
  config = config || {};
  config.credentials = 'same-origin';
  config.headers = config.headers || {};
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
}

function validateKey(key) {
  if (typeof key !== 'string' || key.split(':').length !== 2) {
    throw new TypeError(
      'Theme Cart: Provided key value is not a string with the format xxx:xxx'
    );
  }
}

export function getState() {
  return fetch('/cart.js', applySettings()).then(function(response) {
    return response.json();
  });
}

export function getLineItemIndex(key) {
  if (typeof key !== 'string' || key.split(':').length !== 2) {
    return Promise.reject(
      new TypeError(
        'Theme Cart: Provided key value is not a string with the format xxx:xxx'
      )
    );
  }

  return getState().then(function(state) {
    var index = -1;

    state.items.forEach(function(item, i) {
      index = item.key === key ? i : index;
    });

    if (index === -1) {
      return Promise.reject(
        new Error('Theme Cart: Unable to match line item with provided key')
      );
    }

    return index;
  });
}

export function getLineItem(key) {
  validateKey(key);

  return getState().then(function(state) {
    var lineItem = null;

    state.items.forEach(function(item) {
      lineItem = item.key === key ? item : lineItem;
    });

    return lineItem;
  });
}

export function addLineItem(variantId, options) {
  options = options || {};

  if (typeof variantId !== 'number') {
    throw new TypeError('Theme Cart: Variant ID must be a number');
  }

  options.id = variantId;

  return fetch(
    '/cart/add.js',
    applySettings({
      body: options
    })
  ).then(function(response) {
    return response.json();
  });
}

export function changeLineItem(key, options) {
  if (typeof key !== 'string' || key.split(':').length !== 2) {
    return Promise.reject(
      new TypeError(
        'Theme Cart: Provided key value is not a string with the format xxx:xxx'
      )
    );
  }

  if (
    typeof options !== 'object' ||
    (typeof options.quantity === 'undefined' &&
      typeof options.properties === 'undefined')
  ) {
    return Promise.reject(
      new TypeError(
        'Theme Cart: An object which specifies a quantity or properties value is required'
      )
    );
  }

  return getLineItemIndex(key)
    .then(function(line) {
      options.line = line;

      return fetch(
        '/cart/change.js',
        applySettings({
          body: options
        })
      );
    })
    .then(function(response) {
      return response.json();
    });
}

export function removeLineItem(key) {
  return changeLineItem(key, { quantity: 0 });
}

export function clearLineItems() {
  return fetch('/cart/clear.js', applySettings()).then(function(response) {
    return response.json();
  });
}

export function getAttributes() {
  return getState().then(function(state) {
    return state.attributes;
  });
}

export function setAttributes(attributes) {
  return fetch(
    '/cart/update.js',
    applySettings({ body: { attributes: attributes } })
  ).then(function(response) {
    return response.json();
  });
}

export function clearAttributes() {
  return setAttributes({});
}

export function getNote() {
  return getState().then(function(state) {
    return state.note;
  });
}

export function setNote(note) {
  return fetch('/cart/update.js', applySettings({ body: { note: note } }))
    .then(function(response) {
      return response.json();
    })
    .then(function(state) {
      return state.note;
    });
}

export function clearNote() {
  return setNote(null);
}

export function getShippingRates() {
  return fetch('/cart/shipping_rates.json', applySettings()).then(function(
    response
  ) {
    return response.json();
  });
}
