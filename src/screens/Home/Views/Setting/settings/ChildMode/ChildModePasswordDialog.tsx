import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'

export interface ChildModePasswordDialogField {
  name: string
  label: string
}

export interface ChildModePasswordDialogProps {
  title: string
  fields: ChildModePasswordDialogField[]
  tip?: string
  onConfirm: (values: Record<string, string>) => void
}

export interface ChildModePasswordDialogType {
  show: () => void
}

const initValues = (fields: ChildModePasswordDialogField[]): Record<string, string> => {
  const values: Record<string, string> = {}
  for (const field of fields) values[field.name] = ''
  return values
}

export default forwardRef<ChildModePasswordDialogType, ChildModePasswordDialogProps>(({ title, fields, tip, onConfirm }, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const dialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() => initValues(fields))
  const visibleRef = useRef(false)
  visibleRef.current = visible

  useImperativeHandle(ref, () => ({
    show() {
      setValues(initValues(fields))
      if (visibleRef.current) dialogRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          dialogRef.current?.setVisible(true)
        })
      }
    },
  }))

  const handleCancel = () => {
    dialogRef.current?.setVisible(false)
  }
  const handleConfirm = () => {
    dialogRef.current?.setVisible(false)
    onConfirm(values)
  }

  return (
    visible
      ? (
          <Dialog ref={dialogRef} bgHide={false} title={title}>
            <View style={{ ...styles.content, backgroundColor: theme['c-content-background'] }}>
              {
                fields.map(field => (
                  <View style={styles.item} key={field.name}>
                    <Text style={styles.label} size={13} color={theme['c-font-label']}>{field.label}</Text>
                    <Input
                      value={values[field.name]}
                      onChangeText={text => { setValues(vals => ({ ...vals, [field.name]: text })) }}
                      style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
                      placeholder={field.label}
                      secureTextEntry
                      size={14}
                    />
                  </View>
                ))
              }
              {
                tip ? <Text style={styles.tip} size={12} color={theme['c-font-label']}>{tip}</Text> : null
              }
              <View style={styles.btns}>
                <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleCancel}>
                  <Text size={14} color={theme['c-button-font']}>{t('cancel')}</Text>
                </Button>
                <Button style={{ ...styles.btn, ...styles.confirmBtn, backgroundColor: theme['c-button-background'] }} onPress={handleConfirm}>
                  <Text size={14} color={theme['c-button-font']}>{t('confirm')}</Text>
                </Button>
              </View>
            </View>
          </Dialog>
        ) : null
  )
})

const styles = createStyle({
  content: {
    padding: 15,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  item: {
    marginBottom: 10,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    borderRadius: 4,
    minWidth: 250,
  },
  tip: {
    marginBottom: 10,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 4,
  },
  confirmBtn: {
    marginLeft: 10,
  },
})
