import React from 'react';

import './Hotkey.css';

export default function Hotkey({ hotkey }: { hotkey: string }) {
  return <span className="hotkey">{hotkey}</span>;
}
