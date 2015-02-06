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
                var element = this,
                    allFormElements, children;
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
                // we must add a classname to the i-form and remove it when all
                // i-form-elements are ready. This we need to prevent the i-form-elements
                // to show some initial value before they are bounded
                // now we add all i-form-elements that need to wait for bounded data to a hash
                allFormElements = element.getAll('[itag-formelement="true"][prop]');
                if (allFormElements.length>0) {
                    element.addClass('hide-children');
                    children = [];
                    allFormElements.forEach(function(formElement) {
                        // first tell the element it needs to wait for data:
                        formElement.setAttr('bound-model', 'true');
                        // now add the readypromise to the hash:
                        children[children.length] = formElement.itagReady();
                    });
                    window.Promise.finishAll(children).then(
                        function() {
                            element.removeClass('hide-children');
                        }
                    );
                }
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
                    allFormElements, propertyModel;
                element.setAttr('fm-manage', element.defFmSelector(), true);
                element.unbind();
                allFormElements = element.getAll('[itag-formelement="true"][prop]');
                allFormElements.forEach(function(formElement) {
                    var property = formElement.model.prop;
                    if (property) {
                        propertyModel = model[property];
                        propertyModel && (databinders[databinders.length] = element.bindModel(propertyModel, formElement, true));
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
