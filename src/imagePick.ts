// Picks a photo from the phone's library and returns it as a data: URI, so the logo and signature
// travel with the local database and print offline. Small quality setting keeps the string short.
import * as ImagePicker from 'expo-image-picker';

export async function pickImageDataUri(aspect: [number, number]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('PERMISSION_DENIED');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.6,
    base64: true,
  });
  if (res.canceled) return null;
  const asset = res.assets[0];
  if (!asset?.base64) throw new Error('NO_IMAGE_DATA');
  return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
}
