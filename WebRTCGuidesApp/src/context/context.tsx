import create from 'zustand'

import { data1 } from '../components/map/dataUsers/users1.js'
import { Participant } from '../utils/janus/janus.types.js'

interface Tag {
  tag_id: number
  alias: string
  coordinates: string
  user: number
}

type AppStore = {
  arrayTags: Tag[]
  setArrayTags: (arrayTags) => void
  updateTagsLocation: (tag) => void
  isJanusEnabled: boolean
  setIsJanusEnabled: (isJanusEnabled) => void
  user: Participant | undefined
  setUser: (user) => void
  currentRoomId: number | undefined
  setCurrentRoomId: (currentRoomId) => void
  activeFeedList: Array<number>
  setActiveFeedList: (activeFeedList) => void
  feedStreamList: Array<MediaStream>
  setFeedStreamList: (feedStreamList) => void
}

const mapStoreSlice = set => ({
  arrayTags: [
    
  ],
  setArrayTags: arrayTags => set(state => ({ arrayTags: arrayTags })),
  updateTagsLocation: tag => set(state => state.arrayTags.map(t => (t.tag_id === tag.tag_id ? tag : t)))
})

export const useStore = create<AppStore>(set => ({
  ...mapStoreSlice(set),
  isJanusEnabled: false,
  setIsJanusEnabled: isJanusEnabled => set({ isJanusEnabled }),
  user: undefined,
  setUser: user => set({ user }),
  currentRoomId: undefined,
  setCurrentRoomId: currentRoomId => set({ currentRoomId }),
  activeFeedList: [],
  setActiveFeedList: activeFeedList => set({ activeFeedList }),
  feedStreamList: [],
  setFeedStreamList: feedStreamList => set({ feedStreamList })
}))
