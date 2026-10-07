import { memo, useMemo } from 'react'
import { View } from 'react-native'

import InputItem, { type InputItemProps } from '../../components/InputItem'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'

const MAX_COUNT = 1000

export default memo(() => {
  const t = useI18n()
  const singlePlayCount = useSettingValue('childMode.singlePlayCount')

  const count = useMemo(() => {
    return singlePlayCount > 0 ? singlePlayCount.toString() : ''
  }, [singlePlayCount])

  const setCount: InputItemProps['onChanged'] = (value, callback) => {
    let num = parseInt(value)
    if (Number.isNaN(num) || num < 0) num = 0
    else if (num > MAX_COUNT) num = MAX_COUNT
    callback(num > 0 ? num.toString() : '')
    if (singlePlayCount == num) return
    updateSetting({ 'childMode.singlePlayCount': num })
  }

  return (
    <View style={styles.content}>
      <InputItem
        value={count}
        label={t('child_mode_single_play_count')}
        onChanged={setCount}
        keyboardType="number-pad"
        placeholder={t('child_mode_single_play_count_tip')} />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginBottom: 5,
  },
})
