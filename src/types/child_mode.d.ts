
declare namespace LX {
  namespace ChildMode {
    interface DailyPlayInfo {
      /**
       * 播放日期，格式 yyyy-MM-dd
       */
      date: string
      /**
       * 当日已播放时长 unit 秒
       */
      time: number
      /**
       * 单次（连续）播放时长 unit 秒
       */
      singleTime?: number
      /**
       * 单次已听完的集数
       */
      episodeCount?: number
    }

    interface PlayInfo {
      /**
       * 今日已播放时长 unit 分钟
       */
      playedTime: number
      /**
       * 单次已听完的集数
       */
      episodeCount: number
    }
  }
}
