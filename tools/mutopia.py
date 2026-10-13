"""
Rebuild MIDI files of the MIDI library from their Mutopia LilyPond sources (docs/notes/disassembler.md, the corpus):

- `staff`: as Mutopia's own MIDI (a track a staff), but with the repeats played (`\\unfoldRepeats`): Mutopia's files
  play a repeat once, so a dance's form is half missing. For the files the app ships (midi/<set>/<key>.mid).
- `voice`: a track a voice (LilyPond's Staff_performer moved to the Voice), repeats played: the voices as the typesetter
  wrote them, the ground truth a voice separation is measured against (midi/<set>/voices/<key>.mid; not in the app).

Needs LilyPond (2.24; `convert-ly` brings an old source up to it). Used by hand, as tools/kern2cells.py is:

    python3 tools/mutopia.py <mode> <source folder> <out.mid>

The source folder holds a piece's .ly files as Mutopia publishes them (a -lys.zip unpacked); the one with a `\\score`
is compiled. Nothing is changed but the repeats and, for `voice`, which context writes a track.
"""
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

VOICE_MIDI = '\\context { \\Staff \\remove "Staff_performer" } \\context { \\Voice \\consists "Staff_performer" }'


def build(mode: str, src: pathlib.Path, out: pathlib.Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        work = pathlib.Path(tmp)
        for f in src.iterdir():
            if f.suffix in ('.ly', '.ily', '.lyi') or f.is_dir():
                (shutil.copytree if f.is_dir() else shutil.copy)(f, work / f.name)
        lys = sorted(work.rglob('*.ly'))
        for f in lys:
            # (an old source may keep a rule convert-ly can't apply; what it can is applied, and the notes are checked)
            subprocess.run(['convert-ly', '-e', str(f)], capture_output=True)
        mains = [f for f in lys if re.search(r'\\score\s*\{', f.read_text(errors='replace'))]
        if len(mains) != 1:
            raise SystemExit(f'{src}: {len(mains)} files with a \\score')
        main = mains[0]
        text = main.read_text(errors='replace')
        text = re.sub(r'\\score\s*\{', lambda m: m.group(0) + ' \\unfoldRepeats ', text)
        if mode == 'voice':
            text, n = re.subn(r'\\midi\s*\{', lambda m: m.group(0) + ' ' + VOICE_MIDI + ' ', text)
            if not n:
                raise SystemExit(f'{src}: no \\midi block')
        main.write_text(text)
        # (an old source's layout code may fail in today's LilyPond and the MIDI still be written: kept, and checked
        # against Mutopia's own file by the bench, tools/disasm)
        subprocess.run(
            ['lilypond', '-s', '-dno-print-pages', '-dmidi-extension=mid', '-o', str(work / 'out'), main.name],
            cwd=main.parent,
            capture_output=True,
        )
        made = sorted(work.glob('out*.mid'))
        if not made:
            raise SystemExit(f'{src}: LilyPond wrote no MIDI')
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(made[0], out)


if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[1] not in ('staff', 'voice'):
        raise SystemExit(__doc__)
    build(sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]))
