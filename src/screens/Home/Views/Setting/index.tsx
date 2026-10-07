import { useHorizontalMode } from '@/utils/hooks'
import Vertical from './Vertical'
import Horizontal from './Horizontal'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { useCallback } from 'react'
// import { AppColors } from '@/theme'
import commonState from '@/store/common/state'
import { setNavActiveId } from '@/core/common'
import ChildModeLock from './components/ChildModeLock'

export type { SettingScreenIds } from './Main'

export default () => {
  const isHorizontalMode = useHorizontalMode()
  useBackHandler(useCallback(() => {
    if (Object.keys(commonState.componentIds).length == 1 && commonState.navActiveId == 'nav_setting') {
      setNavActiveId(commonState.lastNavActiveId)
      return true
    }
    return false
  }, []))

  return (
    <ChildModeLock>
      {isHorizontalMode
        ? <Horizontal />
        : <Vertical />}
    </ChildModeLock>
  )
}
