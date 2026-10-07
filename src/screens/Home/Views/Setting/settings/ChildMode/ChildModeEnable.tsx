import { memo, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'

import CheckBoxItem from '../../components/CheckBoxItem'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { disableChildMode, enableChildMode } from '@/core/childMode'
import ChildModePasswordDialog, { type ChildModePasswordDialogType } from './ChildModePasswordDialog'

export default memo(() => {
  const t = useI18n()
  const enable = useSettingValue('childMode.enable')
  const [visibleSet, setVisibleSet] = useState(false)
  const [visibleDisable, setVisibleDisable] = useState(false)
  const setDialogRef = useRef<ChildModePasswordDialogType>(null)
  const disableDialogRef = useRef<ChildModePasswordDialogType>(null)

  const setFields = useMemo(() => [
    { name: 'password', label: t('child_mode_password') },
    { name: 'confirmPassword', label: t('child_mode_confirm_password') },
  ], [t])
  const verifyFields = useMemo(() => [
    { name: 'password', label: t('child_mode_password') },
  ], [t])

  const handleShowSet = () => {
    if (visibleSet) setDialogRef.current?.show()
    else {
      setVisibleSet(true)
      requestAnimationFrame(() => {
        setDialogRef.current?.show()
      })
    }
  }
  const handleShowDisable = () => {
    if (visibleDisable) disableDialogRef.current?.show()
    else {
      setVisibleDisable(true)
      requestAnimationFrame(() => {
        disableDialogRef.current?.show()
      })
    }
  }

  const handleCheckChange = (check: boolean) => {
    if (check) handleShowSet()
    else handleShowDisable()
  }

  const handleSetConfirm = (values: Record<string, string>) => {
    enableChildMode(values.password?.trim() ?? '', values.confirmPassword?.trim() ?? '')
  }
  const handleDisableConfirm = (values: Record<string, string>) => {
    disableChildMode(values.password?.trim() ?? '')
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={enable} label={t('child_mode_enable')} onChange={handleCheckChange} />
      {
        visibleSet
          ? (
              <ChildModePasswordDialog
                ref={setDialogRef}
                title={t('child_mode_enable')}
                fields={setFields}
                tip={t('child_mode_enable_tip')}
                onConfirm={handleSetConfirm}
              />
            ) : null
      }
      {
        visibleDisable
          ? (
              <ChildModePasswordDialog
                ref={disableDialogRef}
                title={t('child_mode_disable')}
                fields={verifyFields}
                tip={t('child_mode_disable_dialog_tip')}
                onConfirm={handleDisableConfirm}
              />
            ) : null
      }
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
