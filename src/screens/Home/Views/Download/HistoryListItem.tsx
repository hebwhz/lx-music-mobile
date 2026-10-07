import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import CheckBox from '@/components/common/CheckBox'

export default memo(({ item, selectMode, selected, onToggleSelect, onStartSelect, onRetry, onDelete }: {
  item: LX.Download.DownloadHistoryItem
  selectMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  onStartSelect: (id: string) => void
  onRetry: (id: string) => void
  onDelete: (id: string) => void
}) => {
  const t = useI18n()
  const theme = useTheme()

  const handlePress = () => {
    if (selectMode) onToggleSelect(item.id)
  }
  const handleLongPress = () => {
    if (!selectMode) onStartSelect(item.id)
  }

  const isFailed = item.status === 'failed'
  const formattedTime = item.completedTime ? new Date(item.completedTime).toLocaleDateString() : '-'
  const fileSize = item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : '-'

  return (
    <TouchableOpacity
      style={{ ...styles.container, borderBottomColor: theme['c-border-background'] }}
      activeOpacity={selectMode ? 0.4 : 1}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      {
        selectMode
          ? (
              <View style={styles.checkBox}>
                <CheckBox check={selected} onChange={() => { onToggleSelect(item.id) }} />
              </View>
            )
          : null
      }
      <View style={styles.info}>
        <Text numberOfLines={1} size={14} color={theme['c-font']}>{item.musicInfo.name}</Text>
        <Text numberOfLines={1} size={12} color={theme['c-font-label']}>{item.musicInfo.singer}</Text>
        <View style={styles.statusRow}>
          <Text size={12} color={isFailed ? theme['c-error-font'] : theme['c-success-font']}>
            {isFailed ? t('download_status_failed') : t('download_status_completed')}
          </Text>
          <Text size={12} color={theme['c-font-label']}>{fileSize}</Text>
          <Text size={12} color={theme['c-font-label']}>{formattedTime}</Text>
        </View>
        {
          isFailed && item.errorMessage
            ? <Text size={12} color={theme['c-error-font']} style={styles.errorTip}>{item.errorMessage}</Text>
            : null
        }
      </View>
      {
        selectMode
          ? null
          : (
              <View style={styles.action}>
                {
                  isFailed
                    ? <Text style={styles.actionBtn} onPress={() => { onRetry(item.id) }} color={theme['c-primary-font']}>{t('download_retry')}</Text>
                    : null
                }
                <Text style={styles.actionBtn} onPress={() => { onDelete(item.id) }} color={theme['c-error-font']}>{t('download_delete')}</Text>
              </View>
            )
      }
    </TouchableOpacity>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  checkBox: {
    flexShrink: 0,
    marginRight: 5,
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  errorTip: {
    marginTop: 4,
  },
  action: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
})
