import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import { View, FlatList, TouchableOpacity } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle, confirmDialog } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useDownloadHistory } from '@/store/download/hook'
import { downloadManager } from '@/core/download'
import HistoryListItem from './HistoryListItem'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const history = useDownloadHistory()
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const list = useMemo(() => [...history].reverse(), [history])

  useEffect(() => {
    if (!history.length) {
      setSelectMode(false)
      setSelectedIds([])
    } else {
      setSelectedIds(ids => ids.filter(id => history.some(item => item.id == id)))
    }
  }, [history])

  const handleClearHistory = async() => {
    const confirm = await confirmDialog({
      message: t('download_clear_history_confirm'),
      bgClose: false,
    })
    if (confirm) {
      await downloadManager.clearHistory()
    }
  }

  const handleExitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds([])
  }, [])

  const handleStartSelect = useCallback((id: string) => {
    setSelectMode(true)
    setSelectedIds([id])
  }, [])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(itemId => itemId != id) : [...ids, id])
  }, [])

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds(ids => ids.length == list.length ? [] : list.map(item => item.id))
  }, [list])

  const handleDelete = useCallback(async(ids: string[]) => {
    if (!ids.length) return
    const confirm = await confirmDialog({
      message: t(ids.length > 1 ? 'download_delete_multiple_confirm' : 'download_delete_confirm', { num: ids.length }),
      bgClose: false,
    })
    if (!confirm) return
    await downloadManager.deleteHistoryItems(ids)
    setSelectedIds(current => current.filter(id => !ids.includes(id)))
  }, [t])

  const handleRetry = useCallback((id: string) => {
    void downloadManager.retryTask(id)
  }, [])

  const handleDeleteOne = useCallback((id: string) => {
    void handleDelete([id])
  }, [handleDelete])

  const renderItem = useCallback(({ item }: { item: LX.Download.DownloadHistoryItem }) => (
    <HistoryListItem
      item={item}
      selectMode={selectMode}
      selected={selectedIds.includes(item.id)}
      onToggleSelect={handleToggleSelect}
      onStartSelect={handleStartSelect}
      onRetry={handleRetry}
      onDelete={handleDeleteOne}
    />
  ), [selectMode, selectedIds, handleToggleSelect, handleStartSelect, handleRetry, handleDeleteOne])

  const keyExtractor = useCallback((item: LX.Download.DownloadHistoryItem) => item.id, [])

  if (!history.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text color={theme['c-font-label']} size={14}>{t('download_empty_history')}</Text>
      </View>
    )
  }

  const isSelectAll = selectedIds.length > 0 && selectedIds.length == list.length

  return (
    <View style={styles.container}>
      <View style={{ ...styles.bar, borderBottomColor: theme['c-border-background'] }}>
        {
          selectMode
            ? (
                <>
                  <Text style={styles.selectedNum} size={13} color={theme['c-font-label']}>
                    {t('download_history_selected_num', { num: selectedIds.length })}
                  </Text>
                  <TouchableOpacity style={styles.barBtn} onPress={handleToggleSelectAll}>
                    <Text size={13} color={theme['c-primary-font']}>{isSelectAll ? t('download_history_unselect_all') : t('download_history_select_all')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.barBtn} onPress={handleExitSelectMode}>
                    <Text size={13} color={theme['c-font-label']}>{t('download_history_cancel')}</Text>
                  </TouchableOpacity>
                </>
              )
            : (
                <TouchableOpacity
                  style={styles.barBtn}
                  onPress={() => { setSelectMode(true) }}
                >
                  <Text size={13} color={theme['c-primary-font']}>{t('download_history_manage')}</Text>
                </TouchableOpacity>
              )
        }
      </View>
      <FlatList
        data={list}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        extraData={selectedIds}
        contentContainerStyle={styles.listContent}
      />
      <View style={{ ...styles.footer, borderTopColor: theme['c-border-background'] }}>
        {
          selectMode
            ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => { void handleDelete(selectedIds) }}
                  disabled={!selectedIds.length}
                >
                  <Text color={selectedIds.length ? theme['c-error'] : theme['c-font-label']}>{t('download_history_delete_selected')}</Text>
                </TouchableOpacity>
              )
            : (
                <Text
                  style={styles.clearBtn}
                  onPress={() => { void handleClearHistory() }}
                  color={theme['c-error']}
                >{t('download_clear_history')}</Text>
              )
        }
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  barBtn: {
    padding: 6,
    marginLeft: 10,
  },
  selectedNum: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 15,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  clearBtn: {
    padding: 10,
  },
  deleteBtn: {
    padding: 10,
  },
})
