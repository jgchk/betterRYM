import getArtistTitle from 'get-artist-title'
import { secondsToString, stringToDate } from '../../utils/datetime'
import { fetchJson } from '../../utils/fetch'
import { FetchRequest } from '../../utils/messaging/codec'
import { getReleaseType } from '../../utils/music'
import { isDefined, isNull } from '../../utils/types'
import { ResolveData, ResolveFunction, Track } from '../types'
import { YOUTUBE_KEY } from './auth'
import { Playlist, PlaylistItems, Video } from './codecs'
import { regex } from './regex'

const parseDuration = (durationString: string) => {
  const seconds = /PT(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/
    .exec(durationString)
    ?.slice(1)
    .map((v) => (!v ? 0 : Number.parseInt(v)))
    .reverse()
    .reduce((accumulator, v, k) => (accumulator += v * 60 ** k), 0)
  return seconds ? secondsToString(seconds) : undefined
}

const parseTitle = (
  data: Video['items'][number] | Playlist['items'][number]
) => {
  const artistTitle = getArtistTitle(data.snippet.title)
  return isDefined(artistTitle)
    ? { artists: [artistTitle[0]], title: artistTitle[1] }
    : { artists: [data.snippet.channelTitle], title: data.snippet.title }
}

const getTrack = async (videoId: string): Promise<Track> => {
  const {
    items: [response],
  } = await fetchJson(
    {
      url: 'https://youtube.googleapis.com/youtube/v3/videos',
      urlParameters: {
        id: videoId,
        part: 'snippet,contentDetails',
        key: YOUTUBE_KEY,
      },
    },
    Video
  )

  const { title } = parseTitle(response)
  const duration = parseDuration(response.contentDetails.duration)

  return { title, duration }
}

const getTracks = async (playlistId: string): Promise<Track[]> => {
  const videos: PlaylistItems['items'] = []

  let pageToken: string | undefined = undefined
  do {
    const urlParameters: FetchRequest['data']['urlParameters'] = {
      playlistId,
      part: 'contentDetails',
      key: YOUTUBE_KEY,
    }
    if (isDefined(pageToken)) {
      urlParameters.pageToken = pageToken
    }

    const { items, nextPageToken } = await fetchJson(
      {
        url: 'https://www.googleapis.com/youtube/v3/playlistItems',
        urlParameters,
      },
      PlaylistItems
    )

    videos.push(...items)
    pageToken = nextPageToken
  } while (isDefined(pageToken))

  return Promise.all(
    videos.map((video) => getTrack(video.contentDetails.videoId))
  )
}

const resolvePlaylist = async (id: string): Promise<ResolveData> => {
  const {
    items: [response],
  } = await fetchJson(
    {
      url: 'https://www.googleapis.com/youtube/v3/playlists',
      urlParameters: { id, part: 'snippet', key: YOUTUBE_KEY },
    },
    Playlist
  )

  const url = `https://www.youtube.com/playlist?list=${response.id}`
  const { title, artists } = parseTitle(response)
  const date = stringToDate(response.snippet.publishedAt)
  const tracks = await getTracks(id)
  const type = getReleaseType(tracks.length)
  const coverArt = Object.values(response.snippet.thumbnails)
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .map((item) => item.url)

  return {
    url,
    title,
    artists,
    date,
    type,
    format: 'digital file',
    attributes: ['streaming'],
    tracks,
    coverArt,
  }
}

const resolveVideo = async (id: string): Promise<ResolveData> => {
  const {
    items: [response],
  } = await fetchJson(
    {
      url: 'https://youtube.googleapis.com/youtube/v3/videos',
      urlParameters: { id, part: 'snippet,contentDetails', key: YOUTUBE_KEY },
    },
    Video
  )

  const url = `https://www.youtube.com/watch?v=${response.id}`
  const { title, artists } = parseTitle(response)
  const date = stringToDate(response.snippet.publishedAt)
  const tracks = [
    { title, duration: parseDuration(response.contentDetails.duration) },
  ]
  const coverArt = [
    `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${id}/sddefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
  ]

  return {
    url,
    title,
    artists,
    date,
    type: 'single',
    format: 'digital file',
    attributes: ['streaming'],
    tracks,
    coverArt,
  }
}

export const resolve: ResolveFunction = async (url) => {
  const match = regex.exec(url)
  if (isNull(match)) throw new Error('Invalid Spotify URL')

  const parsedUrl = new URL(url)
  let videoId: string | undefined
  let playlistId: string | undefined
  if (url.includes('youtu.be')) {
    videoId = parsedUrl.pathname.split('/')[1]
    playlistId = undefined
  } else {
    videoId = parsedUrl.searchParams.get('v') ?? undefined
    playlistId = parsedUrl.searchParams.get('list') ?? undefined
  }

  if (isDefined(playlistId)) {
    return resolvePlaylist(playlistId)
  } else if (isDefined(videoId)) {
    return resolveVideo(videoId)
  } else {
    throw new Error('Could not find ID in link')
  }
}
