# Bryce Beattie Custom Piper Voices - Licensing Documentation

**Source:** https://brycebeattie.com/files/tts/
**Date Captured:** 2025-10-17
**Purpose:** Legal documentation for including custom voices in AgentVibes repository

---

## Creator's Explicit Permission

> "Feel free to use these for any legal and ethical purpose. If somebody wants to upload these to HuggingFace or somewhere similar, you have my blessing."
>
> — Bryce Beattie

**Source URL:** https://brycebeattie.com/files/tts/

---

## Voices We're Including

### 1. Kristin
- **Type:** US English female
- **License:** Public Domain
- **Training:** 2000 epochs on medium quality settings
- **Dataset:** ~11.5 hours from public domain LibriVox.org recordings
- **Download Links:**
  - .onnx: https://sfo3.digitaloceanspaces.com/bkmdls/kristin.onnx
  - .json: https://sfo3.digitaloceanspaces.com/bkmdls/kristin.onnx.json

### 2. Jenny (Dioco)
- **Type:** UK English female (Irish accent)
- **License:** CC BY (Attribution required)
- **Attribution Note:** Similar to Creative Commons Attribution
- **Original Source:** Kaggle dataset (details on source page)
- **Download Links:**
  - .onnx: https://sfo3.digitaloceanspaces.com/bkmdls/jenny.onnx
  - .json: https://sfo3.digitaloceanspaces.com/bkmdls/jenny.onnx.json

### 3. ManyVoice
- **Type:** Multi-speaker (16 voices: 12 US English, 4 UK English)
- **License:** Public Domain
- **Training:** 400 epochs on medium quality settings
- **Dataset:** ~8 hours per voice from public domain LibriVox recordings with sound quality enhancements
- **Download Links:**
  - .onnx: https://sfo3.digitaloceanspaces.com/bkmdls/mv2.onnx
  - .json: https://sfo3.digitaloceanspaces.com/bkmdls/mv2.onnx.json

---

## License Compatibility with Apache 2.0

### Public Domain Voices (Kristin, ManyVoice)
✅ **Fully compatible** - No restrictions on redistribution, modification, or commercial use

### CC BY Licensed Voice (Jenny)
✅ **Compatible** - Requires attribution:
- Include credit to Bryce Beattie
- Link to source: https://brycebeattie.com/files/tts/
- Mention CC BY license
- Already added to AgentVibes README and credits

---

## Legal Basis for Inclusion in AgentVibes Repository

1. **Explicit Permission:** Creator granted blessing for redistribution
2. **Public Domain:** Kristin and ManyVoice have no licensing restrictions
3. **CC BY Compliance:** Jenny voice attributed properly in:
   - README.md (Useful Links section)
   - README.md (Credits/Special Thanks)
   - VOICE_CREDITS.md (dedicated attribution file)
4. **Apache 2.0 Compatibility:** All licenses compatible with our project license

---

## Attribution Requirements

### For Jenny Voice (CC BY):
```
Jenny voice by Bryce Beattie
Source: https://brycebeattie.com/files/tts/
License: CC BY (Creative Commons Attribution)
Original dataset: Dioco dataset (Kaggle)
```

### For Kristin and ManyVoice (Public Domain):
```
Kristin and ManyVoice by Bryce Beattie
Source: https://brycebeattie.com/files/tts/
License: Public Domain
Dataset: LibriVox.org public domain recordings
```

---

## File Locations in AgentVibes

- Voice models: `mcp-server/voices/` (to be created)
- Download script: `.claude/hooks/piper-download-voices.sh`
- Credits: `README.md` and `VOICE_CREDITS.md`

---

## Additional Voices Available (Not Included)

Other voices available from Bryce Beattie that we chose not to include:
- LJSpeech (medium and high)
- Cori (high and medium)
- John
- Norman
- Clean 100 (excluded per user preference)

---

## Notes

- All voice models are ONNX format for Piper TTS
- Each voice includes .onnx model file and .onnx.json config file
- Voices trained on LibriVox public domain audiobooks
- Sound quality enhancements applied during training
- Compatible with Piper TTS engine (https://github.com/rhasspy/piper)

---

## Legal Disclaimer

This documentation represents our good-faith interpretation of the licensing information provided by Bryce Beattie. The explicit permission granted ("you have my blessing") combined with Public Domain and CC BY licenses provides clear legal basis for inclusion in the AgentVibes repository under Apache 2.0 license.

**Date of Legal Review:** 2025-10-17
**Reviewed By:** AgentVibes Project Team
**Status:** ✅ Approved for inclusion with proper attribution
