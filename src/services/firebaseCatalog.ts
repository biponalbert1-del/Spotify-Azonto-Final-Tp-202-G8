export type FirebaseCatalogTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  region: string;
  coverUrl?: string;
  audioUrl?: string;
  duration: string;
};

export async function getRemoteCatalog(): Promise<FirebaseCatalogTrack[] | null> {
  return null;
}
