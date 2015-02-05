module.exports = function (window) {
    "use strict";

    require('polyfill/polyfill-base.js');
    require('./css/i-form.css');

    var itagName = 'i-form', // <-- define your own itag-name here
        DOCUMENT = window.document,
        itagCore = require('itags.core')(window),
        FocusManagerPlugin = require('focusmanager')(window),
        DEFAULT_KEYUP = 'shift+9',
        DEFAULT_KEYDOWN = '9',
        DEFAULT_LOOP = true,
        Itag;

    if (!window.ITAGS[itagName]) {
        Itag = DOCUMENT.createItag(itagName, {

            init: function() {
                var element = this;
                if (!element.isPlugged(FocusManagerPlugin)) {
                    element.plug(
                        FocusManagerPlugin,
                        {
                            'keyup': String(element.defFmKeyup()),
                            'keydown': String(element.defFmKeydown()),
                            'noloop': String(!element.defFmLoop())
                        }
                    );
                }
                element.databinders = [];
            },

            defFmSelector: function() {
                return "[itag-formelement]";
                // return "[itag-formelement='true']";
            },

            defFmKeyup: function() {
                return DEFAULT_KEYUP;
            },

            defFmKeydown: function() {
                return DEFAULT_KEYDOWN;
            },

            defFmLoop: function() {
                return DEFAULT_LOOP;
            },

            sync: function() {
                var element = this,
                    databinders = element.databinders,
                    model = element.model,
                    allFormElements;
                element.setAttr('fm-manage', element.defFmSelector(), true);
                element.unbind();
                allFormElements = element.getAll('[itag-formelement="true"]');
                allFormElements.forEach(function(formElement) {
                    var property = formElement.model.prop;
                    if (property) {
                        databinders[databinders.length] = element.bindModel(model[property], formElement, true);
                    }
                });
            },

            unbind: function() {
                var element = this;
                element.databinders.forEach(function(databinder) {
                    databinder.detach();
                });
            },

            destroy: function() {
                this.unbind();
            }

        }, false); // not subclassable, for we mostly need the css which should be retained

        itagCore.setContentVisibility(Itag, true);

        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
