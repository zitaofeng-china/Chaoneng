import type { FormSchema } from '@/components/Form'
import type { FormItemRule } from 'element-plus'

interface CreateRechargeFormSchemaOptions {
  includeSecret?: boolean
  required: (message?: string) => FormItemRule
}

export const DIRECT_RECHARGE_COIN = 'TRX'

const rechargeAmountRemark = () => (
  <div>
    <span>如果需要扣减余额，请输入负数</span>
    <br />
    <span>例如：输入5，则是增加5余额，输入-5，则是扣减5余额</span>
  </div>
)

export const createRechargeFormSchema = ({
  includeSecret = false,
  required
}: CreateRechargeFormSchemaOptions): FormSchema[] => {
  const schema: FormSchema[] = [
    {
      field: 'amount',
      component: 'InputNumber',
      label: 'TRX金额',
      componentProps: {
        placeholder: '请输入金额',
        style: { width: '100%' },
        remark: rechargeAmountRemark
      },
      formItemProps: {
        rules: [required()]
      }
    }
  ]

  if (includeSecret) {
    schema.push({
      field: 'secret',
      component: 'Input',
      label: '秘钥',
      componentProps: {
        placeholder: '请输入秘钥',
        type: 'password'
      },
      formItemProps: {
        rules: [required('秘钥不能为空')]
      }
    })
  }

  schema.push({
    field: 'describe',
    component: 'Input',
    label: '备注',
    componentProps: {
      placeholder: '请输入备注',
      type: 'textarea',
      rows: 2
    }
  })

  return schema
}

export const createRechargeFormDefaults = (includeSecret = false) => ({
  amount: includeSecret ? '' : undefined,
  describe: '',
  ...(includeSecret ? { secret: '' } : {})
})
