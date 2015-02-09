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
        DEFAULT_SELECTOR = '[itag-formelement]',
        DEFAULT_LOOP = true,
        Event, Itag, getFocusManagerSelector;

    if (!window.ITAGS[itagName]) {
        Event = require('event-mobile')(window);

        getFocusManagerSelector = function(focusContainerNode) {
            var selector = focusContainerNode.getAttr('fm-manage');
            (selector.toLowerCase()==='true') && (selector=DEFAULT_SELECTOR);
            return selector;
        };

        Event.before(itagName+':manualfocus', function(e) {
            // the i-select itself is unfocussable, but its button is
            // we need to patch `manualfocus`,
            // which is emitted on node.focus()
            // a focus by userinteraction will always appear on the button itself
            // so we don't bother that
            var element = e.target;
            e.preventDefault();
            element.itagReady().then(
                function() {
                    var focusNode = element.getElement(getFocusManagerSelector(element));
                    focusNode && focusNode.focus();
                }
            );
        });

        Itag = DOCUMENT.createItag(itagName, {

            init: function() {
                var element = this,
                    designNode = element.getDesignNode(),
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
                allFormElements = designNode.getAll('[i-prop]');
                if (allFormElements.length>0) {
                    element.setClass('hide-children');
                    children = [];
                    allFormElements.forEach(function(formElement) {
                        // first tell the element it needs to wait for data:
                        formElement.setAttr('bound-model', 'true');
                        // now add the readypromise to the hash:
                        formElement._showItagPromise = window.Promise.manage();
                        children[children.length] = formElement._showItagPromise;
                        formElement.itagReady().then(formElement._showItagPromise.fulfill());
                    });
                    window.Promise.finishAll(children).then(
                        function() {
                            element.removeClass('hide-children');
                        }
                    );
                }
                // fully set the designNode's content into the i-form:
                element.setHTML(designNode.getHTML());
            },

            defFmSelector: function() {
                return DEFAULT_SELECTOR;
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
                allFormElements = element.getAll('[i-prop]');
                allFormElements.forEach(function(formElement) {
                    var property = formElement.getAttr('i-prop');
                    if (property) {
                        propertyModel = model[property];
                        if (propertyModel) {
                            databinders[databinders.length] = element.bindModel(propertyModel, formElement, true);
                        }
                        else {
                            // fulfill the promise from the hash, to make the hash completely fulfilled and the i-form to show:
                            formElement._showItagPromise.fulfill();
                        }
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
