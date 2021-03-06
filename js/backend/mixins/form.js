import axios from 'axios'
import AtomSpinner from '../components/Plugins/AtomSpinner.vue'
import Multiselect from 'vue-multiselect'

export default {
    props: ['id'],
    components: { AtomSpinner, Multiselect },
    data() {
        return {
            validation: {},
            pending: false,
            loading: false,
            full_loader: false,
            uploadPercentage: null,
            locale: this.$app.locale,
        }
    },
    watch: {
        id: function (newVal, oldVal) {
            this.fetchData()
        },
    },
    computed: {
        isNew() {
            return this.id === undefined
        },
    },
    methods: {
        async fetchData() {
            if (!this.isNew) {
                try {
                    this.loading = true
                    // let showUrl = `${this.resourceRoute}.show`
                    let showUrl = `${this.resourceRoute}.show`

                    if (this.show_url) {
                        showUrl = this.show_url
                    }

                    let { data } = await axios.get(
                        this.$app.route(showUrl, {
                            [this.modelName]: this.id,
                        })
                    )
                    Object.keys(data).forEach((key) => {
                        if (key in this.model) {
                            this.model[key] = data[key]
                        }
                    })

                    if (this.hasOwnProperty('all_data')) {
                        this.all_data = data
                    }
                    this.onModelChanged()
                    this.loading = false
                } catch (e) {
                    this.loading = false
                    this.$app.error(e)
                    this.$router.push({ name: 'home' })
                }
                this.full_loader = true
            }
        },
        onModelChanged() {},
        feedback(name) {
            if (this.state(name) === false) {
                return this.validation.errors[name][0]
            }
        },
        feedbacks(column, main_lang) {
            let fb = this.feedback(`${column}.${main_lang}`)
            this.$app.available_locales.forEach((locale) => {
                if (locale !== main_lang)
                    fb = fb || this.feedback(`${column}.${locale}`)
            })
            return fb
        },
        state(name) {
            return this.validation.errors !== undefined &&
                this.validation.errors.hasOwnProperty(name)
                ? false
                : null
        },
        states(column) {
            let st = this.$app.available_locales.some((locale) => {
                return this.state(`${column}.${locale}`) === false
            })
            return st === true ? false : null
        },
        async onSubmit() {
            this.pending = true
            this.loading = true
            let router = this.$router
            let action = null
            if (this.url) {
                action = this.url
            } else {
                action = this.isNew
                    ? this.$app.route(`${this.resourceRoute}.store`)
                    : this.$app.route(`${this.resourceRoute}.update`, {
                          [this.modelName]: this.id,
                      })
            }

            let formData = this.$app.objectToFormData(this.model)

            if (!this.isNew && this.method !== 'POST') {
                formData.append('_method', 'PATCH')
            }

            try {
                let { data } = await axios.post(action, formData, {
                    onUploadProgress: function (progressEvent) {
                        this.uploadPercentage = parseInt(
                            Math.round(
                                (progressEvent.loaded * 100) /
                                    progressEvent.total
                            )
                        )
                    }.bind(this),
                })
                this.pending = false
                this.loading = false

                this.$app.noty[data.status](data.message)

                this.$emit('form-submitted-successfully')
                if (this.afterSave()) return
                if (this.listPath) {
                    router.push(this.listPath)
                } else {
                    router.go(-1)
                }
            } catch (e) {
                this.pending = false
                this.loading = false

                // Validation errors
                if (e.hasOwnProperty('response') && e.response.status === 422) {
                    this.validation = e.response.data
                    return
                } else {
                    this.validation = []
                }

                this.$app.error(e)
            }
        },
        afterSave() {
            return false
        },
    },
    created() {
        if (this.translatables)
            this.translatables.forEach((column) => {
                this.$app.available_locales.forEach((locale) => {
                    this.model[column][locale] = null
                })
            })
        if (this.fetch || typeof this.fetch === 'undefined') this.fetchData()
    },
}
