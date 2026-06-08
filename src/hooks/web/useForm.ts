import type { Form, FormExpose } from '@/components/Form'
import type { ElForm, ElFormItem } from 'element-plus'
import { ref, unref, nextTick, shallowRef } from 'vue'
import { FormSchema, FormSetProps, FormProps } from '@/components/Form'
import { isEmptyVal, isObject } from '@/utils/is'

export const useForm = () => {
  const formRef = shallowRef<(typeof Form & FormExpose) | null>(null)

  const elFormRef = shallowRef<ComponentRef<typeof ElForm> | null>(null)

  let _resolveFormReady: (value: boolean) => void
  const formReadyPromise = new Promise<boolean>((resolve) => {
    _resolveFormReady = resolve
  })

  const register = (
    refInstance: typeof Form & FormExpose,
    elRefInstance: ComponentRef<typeof ElForm>
  ) => {
    formRef.value = refInstance
    elFormRef.value = elRefInstance
    _resolveFormReady(true)
  }

  const getFormInstance = async (): Promise<typeof Form & FormExpose> => {
    await formReadyPromise
    await nextTick()
    const form = unref(formRef)
    if (!form) {
      throw new Error('Form instance is not available even after registration.')
    }
    return form
  }

  const getElFormInstance = async (): Promise<ComponentRef<typeof ElForm>> => {
    await formReadyPromise
    await nextTick()
    const elForm = unref(elFormRef)
    if (!elForm) {
      throw new Error('ElForm instance is not available even after registration.')
    }
    return elForm
  }

  const methods = {
    setProps: async (props: FormProps = {}) => {
      const form = await getFormInstance()
      form?.setProps(props)
      if (props.model) {
        form?.setValues(props.model)
      }
    },

    setValues: async (data: Recordable) => {
      const form = await getFormInstance()
      form?.setValues(data)
    },

    setSchema: async (schemaProps: FormSetProps[]) => {
      const form = await getFormInstance()
      form?.setSchema(schemaProps)
    },

    addSchema: async (formSchema: FormSchema, index?: number) => {
      const form = await getFormInstance()
      form?.addSchema(formSchema, index)
    },

    delSchema: async (field: string) => {
      const form = await getFormInstance()
      form?.delSchema(field)
    },

    getFormData: async <T = Recordable>(filterEmptyVal = true): Promise<T> => {
      const form = await getFormInstance()
      const model = form?.formModel
      if (!model) {
        return {} as T
      }

      if (filterEmptyVal) {
        return Object.keys(model).reduce((prev, next) => {
          const value = model[next]
          if (!isEmptyVal(value)) {
            if (isObject(value)) {
              if (Object.keys(value).length > 0) {
                prev[next] = value
              }
            } else {
              prev[next] = value
            }
          }
          return prev
        }, {}) as T
      } else {
        return { ...model } as T
      }
    },

    getComponentExpose: async (field: string) => {
      const form = await getFormInstance()
      return form?.getComponentExpose(field)
    },

    getFormItemExpose: async (field: string) => {
      const form = await getFormInstance()
      return form?.getFormItemExpose(field) as ComponentRef<typeof ElFormItem> | undefined
    },

    getElFormExpose: async () => {
      return await getElFormInstance()
    },

    getFormExpose: async () => {
      return await getFormInstance()
    }
  }

  return {
    formRegister: register,
    formMethods: methods
  }
}
