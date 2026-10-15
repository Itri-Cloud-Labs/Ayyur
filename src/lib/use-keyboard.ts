import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Whether the on-screen keyboard is up, how tall it is, and where its top edge sits on screen. */
export function useKeyboard() {
  const [state, setState] = useState({ open: false, height: 0, top: 0 });

  useEffect(() => {
    // iOS announces the keyboard before it moves, so layouts can change in step with it.
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setState({ open: true, height: e.endCoordinates.height, top: e.endCoordinates.screenY }),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setState({ open: false, height: 0, top: 0 }));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return state;
}
