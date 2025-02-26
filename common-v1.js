(() => {
    const clearErrorHandler = () => {
        $('.ui.error.message')
            .hide()
            .empty();
    };

    const formLoading = (formSelector, loading) => {
        const myForm = $(formSelector);
        if (loading) {
            myForm.addClass('loading')
        } else {
            myForm.removeClass('loading')
        }
    };

    const showError = (header, err) => {
        $('.ui.error.message')
            .show()
            .text(header + ': ' + err);
    };

    const showErrorResponse = (response) => {
        let ul = $('<ul>');
        $.each(response.errors, function(index, err) {
            ul.append($('<li>').text(err));
        });

        $('.ui.error.message')
            .empty()
            .append(ul)
            .show();
    }

    const processForm = (form) => {
        const result = new FormData();

        const arguments = {};
        const meta = {};

        const formData = new FormData(form);
        for (let field of formData) {
            const fieldName = field[0];
            const fieldValue = field[1];

            if (fieldName === 'clusterAlias') {
                arguments['clientCluster'] = fieldValue;
            } else if (fieldName === 'flow') {
                arguments[fieldName] = fieldValue;
            } else if (fieldName === 'ck8sRef') {
                arguments['repoBranchOrTag'] = fieldValue;
            } else if (fieldName.startsWith('arguments.')) {
                const argName = fieldName.substring('arguments.'.length);

                if (!(argName in arguments)) {
                    arguments[argName] = fieldValue;
                } else {
                    if (!Array.isArray(arguments[argName])) {
                        arguments[argName] = [arguments[argName]];
                    }
                    arguments[argName].push(fieldValue);
                }
            } else if (fieldName.startsWith("meta.")) {
                const metaName = fieldName.substring('meta.'.length);
                if (!(metaName in meta)) {
                    meta[metaName] = fieldValue;
                } else {
                    if (!Array.isArray(meta[metaName])) {
                        meta[metaName] = [meta[metaName]];
                    }
                    meta[metaName].push(fieldValue);
                }
            } else if (fieldName.length > 0) {
                result.set(fieldName, fieldValue);
            }
        }

        const requestParams = {};

        if (Object.keys(arguments).length !== 0) {
            requestParams['arguments'] = arguments;
        }

        if (Object.keys(meta).length !== 0) {
            for (let key in meta) {
                if (arguments.hasOwnProperty(key)) {
                    meta[key] = arguments[key];
                } else if (formData.get(key) !== null) {
                    meta[key] = formData.get(key);
                }
            }

            requestParams['meta'] = meta;
        }

        result.set("request", JSON.stringify(requestParams));

        return result;
    }

    window.ck8s = {
        initializeForm: (data, formSelector = '#myForm') => {
            const myForm = $(formSelector);
            myForm
                .form('set values', data.values)
                .form('set values', data);

            myForm.find('select.dropdown')
                .dropdown();
        },

        handleFormSubmission: (options = {}) => {
            const {
                formSelector = '#myForm',
                submitButtonSelector = '#submitButton',
                validateInputCallback
            } = options;

            if (typeof validateInputCallback !== 'function') {
                throw ('Required handlers are missing. Please provide validateInputCallback.');
            }

            $(submitButtonSelector).on('click', function() {
                clearErrorHandler();

                const isValid = validateInputCallback();
                if (!isValid) {
                    return;
                }

                formLoading(formSelector, true);

                const formData = processForm($(formSelector)[0]);

                $.ajax({
                    type: 'POST',
                    url: '/api/ck8s/v3/process',
                    data: formData,
                    processData: false,
                    contentType: false,
                    headers: {
                        'Accept': 'application/json'
                    },
                    success: function(response) {
                        if (response.ok) {
                            window.parent.window.location.href = `${!data.concordHost ? window.location.origin : data.concordHost}/#/process/${response.instanceId}/log`;
                        } else {
                            formLoading(formSelector, false);

                            showErrorResponse(response);
                        }
                    },
                    error: function(error) {
                        showError('Error starting process', `[${error.status}]: ${error.responseText}`);

                        formLoading(formSelector, false);
                    }
                });
            });
        }
    };
})();
