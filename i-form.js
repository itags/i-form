module.exports = function (window) {
    "use strict";

    require('./css/i-form.css');

    var NAME = '[i-form]: ',
        itagName = 'i-form', // <-- define your own itag-name here
        itagCore = require('itags.core')(window),
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        Event = ITSA.Event,
        DEFAULT_KEYUP = 'shift+9',
        DEFAULT_KEYDOWN = '9',
        DEFAULT_KEYENTER = '39',
        DEFAULT_KEYLEAVE = '27',
        DEFAULT_SELECTOR = '[itag-formelement]',
        DEFAULT_LOOP = true,
        Itag;

    if (!window.ITAGS[itagName]) {

        // Event.before(itagName+':manualfocus', function(e) {
        //     // the i-select itself is unfocussable, but its button is
        //     // we need to patch `manualfocus`,
        //     // which is emitted on node.focus()
        //     // a focus by userinteraction will always appear on the button itself
        //     // so we don't bother that
        //     var element = e.target;
        //     e.preventDefault();
        //     element.itagReady().then(
        //         function() {
        //             var selector = element.getFocusManagerSelector(),
        //                 focusNode = element.getElement(selector);
        //             focusNode && focusNode.focus();
        //         }
        //     );
        // });

        Event.after('i-button:tap', function(e) {
            var ibutton = e.target,
                iform = ibutton.inside('i-form');
            if (iform && !iform.model.disabled && !iform.invalid(true)) {
                iform.emitAction({
                    button: ibutton,
                    buttonType: e.buttonType
                });
            }
        }, 'i-form');

        Event.defineEvent('i-form:reset')
             .defaultFn(function(e) {
                 e.target.reset();
             });

        Event.after('i-button#reset:tap', function(e) {
            var ibutton = e.target,
                iform = ibutton.inside('i-form');
            if (iform && !iform.model.disabled) {
                /**
                * Emitted when a the i-select changes its value
                *
                * @event i-form:reset
                * @param e {Object} eventobject including:
                * @param e.target {HtmlElement} the i-form element
                * @param e.button {HTMLElement} the i-button#reset that caused the reset
                * @since 0.1
                */
                iform.emit('reset', {
                    button: ibutton
                });
            }
        }, 'i-form');

        Itag = DOCUMENT.defineItag(itagName, {
            attrs: {
                'active-labels': 'boolean', // to give labels functionality of focussing on itags
                disabled: 'boolean'
            },

            init: function() {
                var element = this;
                // now activate the focusmanager:
                element.plug('fm', {
                    keyup: element.getAttr('fm-keyup') || element.defFmKeyup(),
                    keydown: element.getAttr('fm-keydown') || element.defFmKeydown(),
                    keyenter: element.getAttr('fm-keyenter') || element.defFmKeyenter(),
                    keyleave: element.getAttr('fm-keyleave') || element.defFmKeyleave(),
                    noloop: element.getAttr('fm-noloop') || element.defFmLoop(),
                    manage: element.getAttr('fm-manage') || element.defFmSelector(),
                });
                element.databinders = [];
            },

            render: function() {
                var element = this,
                    designNode = element.getItagContainer(),
                    allFormElements, children;

                // we must add a classname to the i-form and remove it when all
                // i-form-elements are ready. This we need to prevent the i-form-elements
                // to show some initial value before they are bounded
                // now we add all i-form-elements that need to wait for bounded data to a hash

                // fully set the designNode's content into the i-form:
                element.setHTML(designNode.getHTML(null, true));
                allFormElements = element.getAll('[i-prop], i-label');
                if (allFormElements.length>0) {
                    element.setClass('hide-children');
                    children = [];
                    allFormElements.forEach(function(formElement) {
                        // first tell the element it needs to wait for data:
                        formElement.hasAttribute('i-prop') && formElement.setAttr('bound-model', 'true');
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
                ITSA.async(function() {
                    element.bind();
                });
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

            defFmKeyenter: function() {
                return DEFAULT_KEYENTER;
            },

            defFmKeyleave: function() {
                return DEFAULT_KEYLEAVE;
            },

            defFmLoop: function() {
                return DEFAULT_LOOP;
            },

            emitAction: function(payload) {
                /**
                * Emitted when an i-button is pressed inside the i-form
                * and the i-form is not disabled and validated.
                *
                * @event i-form:action
                * @param e {Object} eventobject including:
                * @param e.target {HtmlElement} the i-form element
                * @param e.button {HtmlElement} the i-button that was pressed
                * @param e.buttonType {String}
                * @since 0.1
                */
                this.emit('action', payload);
            },

            _afterBindModel: function() {
                this.unbind();
                this.bind();
            },

            bind: function() {
                var element = this,
                    databinders = element.databinders,
                    model = element.model,
                    allFormElements, propertyModel;
                allFormElements = element.getAll('[i-prop]');
                allFormElements.forEach(function(formElement) {
                    var property = formElement.getAttr('i-prop');
                    if (property) {
                        propertyModel = model[property];
                        if (propertyModel) {
                            databinders[databinders.length] = formElement.bindModel(propertyModel, true);
                        }
                        else {
                            // fulfill the promise from the hash, to make the hash completely fulfilled and the i-form to show:
                            formElement._showItagPromise && formElement._showItagPromise.fulfill();
                            console.warn(NAME+'Form-element waits for prop: '+property+', but this property is not bound. Will show the form, but not this element.');
                        }
                    }
                });
            },

            currentToReset: function() {
                // will set the current value as the reset-value: for all form elements
                this.getAll('[itag-formelement]').forEach(function(element) {
                    element.currentToReset && element.currentToReset();
                });
            },

            reset: function() {
                // will reset all form elements
                this.getAll('[itag-formelement]').forEach(function(element) {
                    element.reset && element.reset();
                });
            },

            invalid: function(focus) {
                // will reset all form elements
                var childElement;
                this.getAll('[itag-formelement]').some(function(element) {
                    element.invalid && element.invalid() && (childElement=element);
                    return childElement;
                });
                focus && childElement && childElement.focus();
                return childElement;
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
