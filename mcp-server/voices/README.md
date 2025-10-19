---
license: apache-2.0
tags:
- text-to-speech
- piper
- tts
- voice-synthesis
language:
- en
---

# AgentVibes Custom Piper Voices

High-quality custom Piper TTS voices for the AgentVibes project.

## Voices Included

### 1. Kristin
- **Type:** US English female
- **License:** Public Domain
- **Quality:** Medium (2000 epochs)
- **Dataset:** ~11.5 hours from LibriVox.org
- **Creator:** Bryce Beattie
- **Source:** https://brycebeattie.com/files/tts/

### 2. Jenny
- **Type:** UK English female (Irish accent)
- **License:** CC BY (Attribution required)
- **Quality:** High
- **Dataset:** Dioco (Kaggle)
- **Creator:** Bryce Beattie
- **Source:** https://brycebeattie.com/files/tts/

### 3. Tracy (ManyVoice)
- **Type:** Multi-speaker (16 voices: 12 US English, 4 UK English)
- **License:** Public Domain
- **Quality:** Medium (400 epochs)
- **Dataset:** ~8 hours per voice from LibriVox.org
- **Creator:** Bryce Beattie
- **Source:** https://brycebeattie.com/files/tts/

## Usage

### With AgentVibes

These voices are automatically available when using AgentVibes with Piper TTS provider.

Install AgentVibes:
```bash
npx agentvibes@beta install
```

Switch to Piper provider:
```bash
/agent-vibes:provider switch piper
```

Use custom voices:
```bash
/agent-vibes:switch kristin
/agent-vibes:switch jenny
/agent-vibes:switch tracy
```

### Manual Download

```bash
# Download all voices
git clone https://huggingface.co/agentvibes/piper-custom-voices

# Or download individual voices
wget https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/kristin.onnx
wget https://huggingface.co/agentvibes/piper-custom-voices/resolve/main/kristin.onnx.json
```

### With Piper TTS

```bash
echo "Hello from Kristin" | piper \
  --model kristin.onnx \
  --output_file output.wav
```

## File Sizes

- **kristin.onnx**: ~64MB
- **jenny.onnx**: ~64MB
- **tracy.onnx**: ~74MB

## Attribution

All voices created by **Bryce Beattie** (https://brycebeattie.com/files/tts/)

### Creator's Permission

> "Feel free to use these for any legal and ethical purpose. If somebody wants to upload these to HuggingFace or somewhere similar, you have my blessing."
>
> — Bryce Beattie, https://brycebeattie.com/files/tts/

### Voice Licenses

- **Kristin:** Public Domain (LibriVox recordings)
- **Jenny:** CC BY (Attribution required - Dioco dataset)
- **Tracy:** Public Domain (LibriVox recordings)

## License

- **Repository License:** Apache 2.0
- **Voice Licenses:** See individual voice descriptions above
- **Dataset Sources:** LibriVox.org (Public Domain), Dioco/Kaggle (CC BY)

## Links

- **AgentVibes:** https://github.com/paulpreibisch/AgentVibes
- **Piper TTS:** https://github.com/rhasspy/piper
- **Voice Creator:** https://brycebeattie.com/files/tts/
- **HuggingFace Voices:** https://huggingface.co/rhasspy/piper-voices

## Technical Details

- **Format:** ONNX (Open Neural Network Exchange)
- **Engine:** Piper TTS (https://github.com/rhasspy/piper)
- **Training:** LibriVox public domain audiobooks
- **Quality:** Medium to High (400-2000 epochs)
- **Enhancements:** Sound quality improvements applied during training

## Contributing

Found a bug or want to suggest a voice? Open an issue at:
https://github.com/paulpreibisch/AgentVibes/issues
