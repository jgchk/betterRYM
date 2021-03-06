import { ReleaseType } from '../services/types'

export const getReleaseType = (numberOfTracks: number): ReleaseType => {
  if (numberOfTracks <= 3) {
    return 'single'
  } else if (numberOfTracks <= 7) {
    return 'ep'
  } else {
    return 'album'
  }
}
