import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'

import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useNavActiveId } from '@/store/common/hook'
import { useSettingValue } from '@/store/setting/hook'
import { setNavActiveId } from '@/core/common'
import commonState from '@/store/common/state'
import { isSettingLocked, lockSetting, verifySettingPassword } from '@/core/childMode'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'

export default memo(({ children }: {
  children: React.ReactNode | React.ReactNode[]
}) => {
  const t = useI18n()
  const theme = useTheme()
  const enable = useSettingValue('childMode.enable')
  const navActiveId = useNavActiveId()
  const [password, setPassword] = useState('')
  const [verified, setVerified] = useState(!isSettingLocked())

  useEffect(() => {
    if (navActiveId == 'nav_setting') {
      setVerified(!isSettingLocked())
      return
    }
    lockSetting()
    setPassword('')
    setVerified(false)
  }, [navActiveId, enable])

  const locked = enable && !verified

  const handleUnlock = () => {
    if (!verifySettingPassword(password)) {
      setPassword('')
      return
    }
    setPassword('')
    setVerified(true)
  }

  const handleBack = () => {
    setNavActiveId(commonState.lastNavActiveId)
  }

  if (!locked) return <>{children}</>

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-main-background'] }}>
      <View style={{ ...styles.content, backgroundColor: theme['c-content-background'] }}>
        <Text style={styles.title} size={16} color={theme['c-font']}>{t('child_mode_setting_lock_title')}</Text>
        <Text style={styles.desc} size={13} color={theme['c-font-label']}>{t('child_mode_setting_lock_desc')}</Text>
        <Input
          value={password}
          onChangeText={setPassword}
          style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
          placeholder={t('child_mode_password')}
          secureTextEntry
          size={14}
        />
        <View style={styles.btns}>
          <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleBack}>
            <Text size={14} color={theme['c-button-font']}>{t('back')}</Text>
          </Button>
          <Button style={{ ...styles.btn, ...styles.confirmBtn, backgroundColor: theme['c-button-background'] }} onPress={handleUnlock}>
            <Text size={14} color={theme['c-button-font']}>{t('confirm')}</Text>
          </Button>
        </View>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderRadius: 4,
  },
  title: {
    marginBottom: 8,
  },
  desc: {
    marginBottom: 15,
  },
  input: {
    borderRadius: 4,
    marginBottom: 15,
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
