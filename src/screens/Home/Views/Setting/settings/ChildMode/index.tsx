import { memo } from 'react'

import Section from '../../components/Section'
import ChildModeEnable from './ChildModeEnable'
import ChildModePassword from './ChildModePassword'
import ChildModeSinglePlayTime from './ChildModeSinglePlayTime'
import ChildModeSinglePlayCount from './ChildModeSinglePlayCount'
import ChildModeRestTime from './ChildModeRestTime'
import ChildModeDailyPlayTime from './ChildModeDailyPlayTime'
import ChildModePlayedTime from './ChildModePlayedTime'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const enable = useSettingValue('childMode.enable')

  return (
    <Section title={t('setting_child_mode')}>
      <Text style={styles.desc} size={13} color={theme['c-font-label']}>{t('child_mode_desc')}</Text>
      <ChildModeEnable />
      {
        enable
          ? (
              <>
                <ChildModeSinglePlayTime />
                <ChildModeSinglePlayCount />
                <ChildModeRestTime />
                <ChildModeDailyPlayTime />
                <ChildModePlayedTime />
                <ChildModePassword />
              </>
            ) : null
      }
    </Section>
  )
})

const styles = createStyle({
  desc: {
    marginBottom: 10,
  },
})
