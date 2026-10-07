import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'

import Text from '@/components/common/Text'
import { createStyle, confirmDialog } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { resetTodayPlayTime, useChildModePlayInfo } from '@/core/childMode'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const { playedTime, episodeCount } = useChildModePlayInfo()

  const handleReset = async() => {
    const confirm = await confirmDialog({
      message: t('child_mode_reset_play_time_confirm'),
      bgClose: false,
    })
    if (!confirm) return
    resetTodayPlayTime()
  }

  return (
    <View style={styles.content}>
      <View style={styles.info}>
        <Text size={13} color={theme['c-font-label']}>
          {t('child_mode_played_time', { time: playedTime })}
        </Text>
        <Text style={styles.count} size={13} color={theme['c-font-label']}>
          {t('child_mode_played_count', { count: episodeCount })}
        </Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => { void handleReset() }}>
        <Text size={13} color={theme['c-primary-font']}>{t('child_mode_reset_play_time')}</Text>
      </TouchableOpacity>
    </View>
  )
})

const styles = createStyle({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 25,
    marginBottom: 15,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  count: {
    marginLeft: 10,
  },
  btn: {
    marginLeft: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
})
