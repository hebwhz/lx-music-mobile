import { memo, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import { changeChildModePassword } from '@/core/childMode'
import ChildModePasswordDialog, { type ChildModePasswordDialogType } from './ChildModePasswordDialog'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'

export default memo(() => {
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const dialogRef = useRef<ChildModePasswordDialogType>(null)

  const fields = useMemo(() => [
    { name: 'oldPassword', label: t('child_mode_old_password') },
    { name: 'password', label: t('child_mode_new_password') },
    { name: 'confirmPassword', label: t('child_mode_confirm_password') },
  ], [t])

  const handleShow = () => {
    if (visible) dialogRef.current?.show()
    else {
      setVisible(true)
      requestAnimationFrame(() => {
        dialogRef.current?.show()
      })
    }
  }

  const handleConfirm = (values: Record<string, string>) => {
    changeChildModePassword(values.oldPassword?.trim() ?? '', values.password?.trim() ?? '', values.confirmPassword?.trim() ?? '')
  }

  return (
    <SubTitle title={t('child_mode_password_setting')}>
      <View style={styles.btn}>
        <Button onPress={handleShow}>{t('child_mode_change_password_btn')}</Button>
      </View>
      {
        visible
          ? (
              <ChildModePasswordDialog
                ref={dialogRef}
                title={t('child_mode_change_password_btn')}
                fields={fields}
                onConfirm={handleConfirm}
              />
            ) : null
      }
    </SubTitle>
  )
})

const styles = createStyle({
  btn: {
    flexDirection: 'row',
  },
})
