import {Playlist, Track} from './types';

export const defaultCover = require('../musics test/defaut.jpg');

export const fallbackTracks: Track[] = [
  {
    id: 'fally-likolo',
    title: 'Likolo',
    artist: 'Fally Ipupa feat. Ninho',
    genre: 'Afro-pop',
    region: 'RDC',
    cover: defaultCover,
    audio: 'fally_likolo',
    duration: '3:13',
    plays: 'Test',
    liked: true,
  },
  {
    id: 'fally-afsana',
    title: 'Afsana',
    artist: 'Fally Ipupa',
    genre: 'Afro-pop',
    region: 'RDC',
    cover: require('../musics test/fally ipupa 1.jpg'),
    audio: 'fally_afsana',
    duration: '4:47',
    plays: 'Test',
  },
  {
    id: 'amour-mere',
    title: "L'amour d'une mere",
    artist: 'Selection test',
    genre: 'Variete',
    region: 'Afrique',
    cover: require("../musics test/L_amour_d_une_mère.jpg"),
    audio: 'amour_mere',
    duration: '4:00',
    plays: 'Test',
    liked: true,
  },
  {
    id: 'michael-bad',
    title: 'Bad',
    artist: 'Michael Jackson',
    genre: 'Pop',
    region: 'USA',
    cover: require('../musics test/michael jackson.jpg'),
    audio: 'michael_bad',
    duration: '4:19',
    plays: 'Test',
  },
  {
    id: 'nelly-dream',
    title: 'Just A Dream',
    artist: 'Nelly',
    genre: 'R&B',
    region: 'USA',
    cover: require('../musics test/Nelly.jpg'),
    audio: 'nelly_just_a_dream',
    duration: '4:01',
    plays: 'Test',
    liked: true,
  },
  {
    id: 'rio-roma-vino',
    title: 'Vino el Amor',
    artist: 'Rio Roma',
    genre: 'Latin',
    region: 'Mexique',
    cover: require("../musics test/Río_Roma.jpg"),
    audio: 'rio_roma_vino',
    duration: '3:14',
    plays: 'Test',
  },
  {
    id: 'serge-lopangwe',
    title: 'Lopangwe',
    artist: 'Serge Beynaud feat. Eddy Kenzo',
    genre: 'Coupe Decale',
    region: "Cote d'Ivoire",
    cover: require('../musics test/sege beynaud.jpg'),
    audio: 'serge_lopangwe',
    duration: '3:49',
    plays: 'Test',
  },
  {
    id: 'sergeo-amour',
    title: 'Amour a Deux',
    artist: 'Sergeo Polo',
    genre: 'Makossa',
    region: 'Cameroun',
    cover: require('../musics test/sergo polo.jpg'),
    audio: 'sergeo_amour',
    duration: '5:41',
    plays: 'Test',
  },
];

export const visualizerBars = [
  22, 44, 58, 49, 43, 28, 61, 72, 79, 38, 21, 42, 75, 34, 45, 64, 28, 22, 51,
  67, 69, 19, 48, 56, 64, 73,
];

export const genres = [
  ['Afrobeat', '#ff7a08'],
  ['Amapiano', '#ffb11b'],
  ['Gospel', '#8a2be2'],
  ['Makossa', '#c44536'],
  ['Coupe Decale', '#00a86b'],
  ['Latin', '#1473e6'],
] as const;

export const starterPlaylists: Playlist[] = [
  {id: 'made-in-africa', name: 'Made in Africa', trackIds: [], createdAt: 'local'},
  {id: 'azonto-night', name: 'Azonto Night', trackIds: [], createdAt: 'local'},
  {id: 'amapiano-sunset', name: 'Amapiano Sunset', trackIds: [], createdAt: 'local'},
];
