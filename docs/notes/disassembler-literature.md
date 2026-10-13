# The disassembler's literature: what to reuse, which swamps to avoid

Date: 2026-10-13 · Status: open (topics 1–6 of 9 done; one topic a session) · Issues: #365, the epic #364, the frame
[disassembler.md](disassembler.md)

One section a topic. Each answers five questions: the state of the art, what we take, what we leave, the nearest
swamp, and our numbers against theirs. Every reference below was opened and read at least to its abstract and results;
where a number comes from the full text, the section says so. The leads for topics 7–9 are in the issue, not repeated
here.

## 1. Compression as analysis

**State of the art.**
- **Grammar induction.**
  - Sequitur [NW97] builds a grammar online in linear time, by two constraints: no pair twice, every rule used at
    least twice. Re-Pair [LM00] is offline: the most frequent pair becomes a rule, again and again, in linear time and
    space. That is our `fold/pairs.ts`.
  - The smallest grammar is NP-hard, and hard to approximate within a constant factor [CLL+05]. The best
    polynomial ratio proved is O(log(n/g*)). For Re-Pair the lower bound is now Ω(log n / log log n) [BHH+19]: no
    guarantee, but good in practice.
  - **On music**, Sidorov, Jones & Marshall [SJM14] take each voice of a fugue as a string of diatonic intervals
    (transposition-free, rhythm ignored). They search for the smallest grammar by iterative repeat replacement:
    - each step takes the "locally most compressive" repeat, F = L·N − (L + 1 + N), over maximal repeats (found by
      suffix array);
    - it backtracks over the w best candidates to a depth of 2–3 ("more … usually does not yield any further
      reduction").
  - Their results:
    - The rules match a musicologist's analysis of WTC I/10 (|G| = 217).
    - Their grammar is smaller than Sequitur's on two chorales: 50 against 59.
    - As a spell-checker: undoing one wrong note shrinks the grammar. The error ranks among the top 1.55 % (I/10)
      to 16.71 % (a Berlioz string part) of all notes.
- **MDL.** Rissanen [Ris78]: the best model is the shortest description. Grünwald [Grü04; Grü07] separates *crude*
  two-part MDL (minimise L(H) + L(D|H), with L(H) chosen by hand) from *refined* MDL. Its §1.4 names the weak spot of
  crude MDL: the hypothesis' code L(H) is arbitrary.
- **Point sets** (SIA and its family; Meredith's survey [Mer16] has the full text and every number below):
  - A piece is a set of points (onset, pitch), with every voice in it.
  - **SIA** [MLW02] finds every maximal translatable pattern (MTP), the points that a vector (Δt, Δp) maps onto other
    points. It takes Θ(kn² log n) time and Θ(kn²) space.
  - **SIATEC** adds each pattern's translational equivalence class (TEC): the pattern and every vector it occurs at.
    It takes O(kn³) time.
  - **COSIATEC** covers the piece greedily. At each step it takes the TEC with the best compression factor (points
    covered ÷ (pattern points + translators)), breaking ties by compactness.
  - Morphetic (diatonic) pitch works better than chromatic for tonal music.
  - On BWV 846's fugue (728 notes), COSIATEC reaches a compression factor of **2.90** (3.12 without its residual of
    26 notes). The subject's entries (less their first note) are one TEC.
  - **Folk-song tune families** (the Annotated Corpus, 360 melodies, 1-nearest neighbour on a compression distance):
    COSIATEC classifies **84 %**, against BZIP2's 12.5 %. BZIP2 compresses best (2.77 against 1.58) and still classifies
    worst.
  - **JKU-PDD themes and sections:** a mean three-layer F1 of about 0.49, rising to 0.71 for one piece. The journal
    version [Mer15] (best SIATECCompress variants): themes 45 % precision / 60 % recall; fugue subject and
    countersubject entries 21 % / 55 %.
  - **General-purpose compressors on fugues** [LM16]:
    - With no voice information, COSIATEC finds subject and countersubject entries at a mean F1 of **0.123**,
      against LZ77's 0.053.
    - Fed a voice at a time, LZ77 reaches **0.124**.
    - Across all algorithms, compression and F1 are significantly correlated.
  - **Later work:**
    - RecurSIA-RRT [Mer19] runs the cover recursively within each pattern: more compression, less precision.
    - SIATEC-C [Bjö22] is subquadratic in space and no less accurate on JKU-PDD. Plugged into COSIATEC, it didn't
      improve COSIATEC.
    - Maximal transformable patterns [Mer22] find patterns related by inversion, retrograde, augmentation and
      diminution in polynomial time. These classes improved folk-song classification but **not, on average,
      compression**.
- **IDyOM** (Pearce [Pea05], from Conklin & Witten's multiple viewpoints [CW95]) is a prediction model:
  - variable-order Markov models over several viewpoints (pitch, interval, scale degree, …), combined, long-term
    (the corpus) and short-term (the piece);
  - on 185 Bach chorale melodies (10-fold), pitch at **1.953 bits a note** with the viewpoints it selects, against
    2.342 for chromatic pitch alone (thesis §7.5);
  - since then, one model for expectation, segmentation, memory, similarity and meter [Pea18].

**What we take.**
1. **Sidorov's choice of repeat, as a variant of `fold/pairs.ts`.**
   - Our Re-Pair takes the *most frequent pair*. [SJM14] instead takes the repeat of any length that saves the most,
     F = L·N − (L + 1 + N), with a shallow backtrack, and beats the greedy grammar (50 against 59 on the chorales).
   - The bench decides whether it pays in our characters: a tool in `fold/index.ts`'s list, judged on `bare`. Only the
     algorithm is taken; the paper is CC BY 4.0.
   - Our `variants.ts` seeds (phrases grown from five steps) are already halfway there.
2. **The point-set view, for the higher-order tool.**
   - A TEC is a pattern and its vectors (Δt, Δp). With morphetic pitch, a canon per tonos is one TEC: the whole
     canon at vectors (a pass, +1 scale step), (two passes, +2), …
   - That is the *path shared by lines* that [disassembler.md](disassembler.md) names as the next tool, found
     without separating voices.
   - Take SIATEC's vector table (SIA's sorted inter-point vectors) as how `tools/disasm/higher.ts` looks for a path
     across lines. Port it: about 50 lines from [Mer16]'s pseudocode.
   - For reference runs, offline and outside the repo:
     - OMNISIA (Java, **GPL-3.0**, github.com/chromamorph/omnisia-recursia-rrt-mml-2019: SIA, SIATEC, COSIATEC,
       SIATECCompress, Forth, RecurSIA);
     - ostinato (Python SIATEC, **MIT**, github.com/pauldhein/ostinato).
     - The repo states no licence of its own, so no GPL code goes in.
3. **A comparable size column on the bench.**
   - Meredith's compression factor is notes ÷ (pattern points + translators).
   - Ours, as near as the cells allow: notes ÷ (notes written in cells + splices). Then `bare` stays the judge and the
     factor is the bridge to the literature (*Our numbers*, below).
4. **Sidorov's spell-check, as a corpus tool.**
   - Our Mutopia MIDI and the voices written are typeset by hand. A note whose correction shortens the fold a lot is
     a suspect. The same move as their Table 2, on `bare`.
5. **The name for what we do.**
   - `bare` plus `STRUCTURE` (15 %) and `SAID` (2 a step) is crude two-part MDL: the two constants are our hand-chosen
     L(H).
   - That is [Grü04] §1.4's objection, and the bench is our answer: the constants are tuned on phrases back, not
     argued.
   - [LM16]'s correlation (shorter is closer to the analyst) is the evidence that the frame holds.

**What we leave, and why.**
- **The smallest grammar as a target.** It is NP-hard, and [SJM14] saw no gain past a backtrack of 2–3. Take the
  better heuristic, not optimality.
- **Sequitur.** Online and greedier than Re-Pair, and worse on music ([SJM14]: 59 against 50). We have the whole piece.
- **COSIATEC as the folder.**
  - A cell is a line on a clock. A TEC is a set of points that can span voices and leave gaps, so it can't be printed
    as one cell unless the language grows a polyphonic, gapped cell (decision-sized: stop and recommend).
  - It also drops durations, and our fidelity gate (`sameNotes`) needs them.
  - So it is a reference and a finder, not the folder.
- **General-purpose compressors and normalised compression distance.** BZIP2 compresses best and classifies worst
  (12.5 %). Compression without the music's moves isn't analysis.
- **IDyOM, for now.**
  - It is GPL-3.0 Common Lisp, trained on a corpus, and it predicts. Its bits a note are a listener's surprise, not a
    piece's description.
  - It is a lead for the *heard* metric (topic 6): its information content predicts where listeners segment
    [Pea18]. That is where `tools/disasm/heard.ts` falls short on counterpoint.

**The nearest swamp.**
- **Too many patterns.**
  - SIA finds O(n²) patterns, and almost all of them are musically meaningless [Bjö22, §1].
  - A decade went into choosing among them: compactness trawlers, SIAR, categorisation, CFP [Mer16; Bjö22]. Each one
    trades precision against recall on five JKU-PDD pieces.
  - We have a selection principle they lack: the fold must play the notes and be shorter. Don't import the trawler
    zoo; use the point set to *find* candidates and let `bare` choose.
- **Richer transformations.** Inversion, retrograde and augmentation as pattern classes [Mer22] cost an algorithm
  each and didn't improve compression on folk songs. Evidence for the language question in
  [disassembler.md](disassembler.md): ask the canons, not the general case.

**The key question: is SIA an alternative to the voices step or a complement?** **A complement.**
- [LM16] measured both routes on Bach's fugues:
  - SIA without voices: F1 0.123;
  - a string compressor a voice at a time: 0.124.
  - The two are equal, and both are low.
- The voice route is the one the cells can print (a line a voice), and ours is better than the typesetters' split by
  hand (`voices.ts`: 96 % / 93 %).
- SIA adds what the voice route can't see:
  - a pattern handed between voices;
  - a pattern in two voices at once (a subject in thirds);
  - the shared path of a canon per tonos, found as one vector set.
- Run it after the voices, over all the notes, as the higher-order finder. Its patterns that cross voices are also
  evidence against the voice split (a check on `voices.ts`, not a replacement).

**Our numbers against theirs.**
- **WTC I/1 fugue (BWV 846), 728 notes.** It is the same note count as [Mer16]'s, so it is the same piece and the
  same notes. (`BENCH=… SET=wtc ONLY=wtc1-01-fugue,wtc1-10-fugue npx vitest run tools/disasm/bench.test.ts`, today.)

  | | ratio | unit |
  |---|---|---|
  | ours, a line a hand | 3,722 → 2,994 = **1.24** | characters (`bare`) |
  | ours, a line a voice (the typesetter's) | 3,722 → 2,620 = **1.42** | characters |
  | COSIATEC [Mer16] | **2.90** | points ÷ (pattern points + translators), durations dropped |

  This is not the same measure. A point or a vector costs COSIATEC 1, whatever its size. We count every character,
  durations and syntax included. The comparable column (*What we take*, 3) closes the gap.
- **WTC I/10 fugue, 811 notes, 2 voices:**
  - [SJM14]: |G| = 217 symbols, for intervals without rhythm.
  - Ours: 2,651 → 1,416 characters (1.87), with rhythm.
  - Not comparable either. A count of our tokens with durations stripped would be.
- **IDyOM's bits a note.** No counterpart: we describe a piece, it predicts from a corpus.

**Next.**
- #380: *the fold's choice of repeat* (Sidorov's F with a shallow backtrack, as a variant of `pairs.ts`, judged on
  the bench).
- #381: *the higher-order finder by translation vectors* (SIA's vector table over all notes, morphetic pitch).
  - Its test is the canon per tonos' plan (`higher.test.ts`).
  - It goes into `higher.ts`.
- The bench: a compression factor column comparable with COSIATEC's, and the spell-check as a corpus tool (later, with
  the corpus' own issue).
- Topic 2 (the JKU-PDD and its metrics): below.

**References** (each opened; DOIs checked against Crossref).
- [Bjö22] O. Björklund, "SIATEC-C: computationally efficient repeated pattern discovery in polyphonic music",
  ISMIR 2022. https://archives.ismir.net/ismir2022/paper/000006.pdf
- [BHH+19] H. Bannai, M. Hirayama, D. Hucke, S. Inenaga, A. Jeż, M. Lohrey, C. P. Reh, "The smallest grammar problem
  revisited", arXiv:1908.06428 (short version SPIRE 2016).
- [CLL+05] M. Charikar, E. Lehman, D. Liu, R. Panigrahy, M. Prabhakaran, A. Sahai, a. shelat, "The smallest grammar
  problem", IEEE Trans. Inf. Theory 51(7):2554–2576, 2005. doi:10.1109/TIT.2005.850116. The preprint was read
  ("Approximating the smallest grammar", 2002).
- [CW95] D. Conklin, I. H. Witten, "Multiple viewpoint systems for music prediction", JNMR 24(1):51–73, 1995.
  doi:10.1080/09298219508570672. Its number was read as cited in [Pea05]: 1.87 bits an event.
- [Grü04] P. Grünwald, "A tutorial introduction to the minimum description length principle", arXiv:math/0406077.
- [Grü07] P. Grünwald, *The Minimum Description Length Principle*, MIT Press, 2007. doi:10.7551/mitpress/4643.001.0001
- [LM00] N. J. Larsson, A. Moffat, "Off-line dictionary-based compression", Proc. IEEE 88(11):1722–1732, 2000.
  doi:10.1109/5.892708
- [LM16] C. Louboutin, D. Meredith, "Using general-purpose compression algorithms for music analysis", JNMR
  45(1):1–16, 2016. doi:10.1080/09298215.2015.1133656
- [Mer15] D. Meredith, "Music analysis and point-set compression", JNMR 44(3):245–270, 2015.
  doi:10.1080/09298215.2015.1045003. Read as its abstract (on vbn.aau.dk); the full text read is [Mer16]'s.
- [Mer16] D. Meredith, "Analysing music with point-set compression algorithms", in D. Meredith (ed.),
  *Computational Music Analysis*, Springer, 2016, 335–366. doi:10.1007/978-3-319-25931-4_13. Full text:
  https://vbn.aau.dk/ws/files/221242362/MeredithCMA2016.pdf
- [Mer19] D. Meredith, "RecurSIA-RRT: recursive translatable point-set pattern discovery with removal of redundant
  translators", arXiv:1906.12286 (MML 2019).
- [Mer22] D. Meredith, "Understanding and compressing music with maximal transformable patterns", arXiv:2201.11085.
- [MLW02] D. Meredith, K. Lemström, G. A. Wiggins, "Algorithms for discovering repeated patterns in multidimensional
  representations of polyphonic music", JNMR 31(4):321–345, 2002. doi:10.1076/jnmr.31.4.321.14162. No open full
  text; its algorithms were read in [Mer16].
- [NW97] C. G. Nevill-Manning, I. H. Witten, "Identifying hierarchical structure in sequences: a linear-time
  algorithm", JAIR 7:67–82, 1997. doi:10.1613/jair.374, arXiv:cs/9709102
- [Pea05] M. T. Pearce, *The construction and evaluation of statistical models of melodic structure in music
  perception and composition*, PhD thesis, City University London, 2005. https://openaccess.city.ac.uk/id/eprint/8459/
  Code: IDyOM, github.com/mtpearce/idyom, GPL-3.0.
- [Pea18] M. T. Pearce, "Statistical learning and probabilistic prediction in music cognition", Ann. N.Y. Acad. Sci.
  1423:378–395, 2018. doi:10.1111/nyas.13654
- [Ris78] J. Rissanen, "Modeling by shortest data description", Automatica 14(5):465–471, 1978.
  doi:10.1016/0005-1098(78)90005-5
- [SJM14] K. Sidorov, A. Jones, D. Marshall, "Music analysis as a smallest grammar problem", ISMIR 2014, 301–306.
  https://archives.ismir.net/ismir2014/paper/000226.pdf

## 2. Pattern discovery benchmarks

**State of the art.**
- **The task.** MIREX's *Discovery of Repeated Themes & Sections* ran from 2013 to 2017, captained by Collins and
  later by Janssen, Ren, Collins and Volk [MX13; MX17].
  - An algorithm reads one piece and returns patterns. A pattern is a set of (onset, pitch) points heard at least twice,
    each with its occurrences, exact or not.
  - There are four versions: symbolic or audio, crossed with polyphonic or monophonic. In the monophonic version a
    fugue's voices are laid end to end.
- **The data.**
  - The **JKU Patterns Development Database** (JKU-PDD, August 2013) [JKU] is public: 5 pieces, about 40 MB without
    audio.
    - Bach's fugue BWV 889 (WTC II/20), Beethoven op. 2/1 iii, Chopin op. 24/4, Gibbons' *The Silver Swan* and Mozart
      K. 282 ii.
    - Each comes as kern, csv (onset in crotchets, MIDI pitch, morphetic pitch, duration, staff), MIDI and a PDF of
      the score.
    - By my count (the readme's annotation folders): **27 polyphonic patterns**.
    - BWV 889 has 3 patterns, after Bruhn's analysis (subject and countersubjects): 21 occurrences over 733 notes.
  - The ground truth comes from Barlow & Morgenstern's dictionary of themes, Schoenberg, Bruhn, the repeat signs, and
    the captain's own annotations.
  - The **test database** (JKUPTD) is another 5 pieces. The results pages don't publish it.
  - **MTC-ANN** is monophonic: 360 Dutch folk songs, 1,657 annotated occurrences of motifs in 26 tune families
    [Ren20], under **CC BY-NC-SA 3.0** [MTC].
  - **BPS-Motif** [HHC+23] covers the first movements of Beethoven's 32 sonatas: 263 motifs, 4,944 occurrences, 28.9 %
    of 126,943 notes. Its repository states no licence.
- **The metrics** [MX13; mir_eval]:
  - Similarity between two occurrences is |P ∩ Q| / max(|P|, |Q|) (cardinality).
  - **Establishment** P/R/F: was each pattern found once, scored by its best match?
  - **Occurrence** P/R/F at c = .75 and .5: of the patterns found, were all their occurrences found?
  - **Three-layer** P/R/F (Meredith): F1 nested over notes, occurrences and patterns.
  - Also: first-five precision and target proportion, runtime, and the strict standard P/R/F, which needs exact
    patterns up to translation.
  - 2017 added *coverage* and *lossless compression* [MX17].
- **The results** (symbolic polyphonic, on the test database; means over 5 pieces, from MIREX's own csv files):

  | year | algorithm | F_est | F_occ(.75) | three-layer F | standard F |
  |---|---|---|---|---|---|
  | 2014 | SIATECSegment (DM10, Meredith) | 0.55 | 0.64 | 0.46 | 0.00 |
  | 2014 | motives_poly (NF2, Nieto & Farbood) | 0.40 | 0.52 | 0.29 | 0.00 |
  | 2016 | SIATECCompress-TLR (DM3, Meredith) | 0.54 | 0.61 | 0.46 | 0.00 |

  - Every algorithm scores standard F about 0: none finds a pattern exactly.
  - In 2013 the captain's conclusion: repeated sections are "addressed well"; themes and motifs "require more
    attention" [MX13 results].
  - **In 2017, compression and retrieval disagreed.** The compression measures were "not highly correlated" with
    retrieval. Overlapping patterns (a motif inside a theme, as annotators write them) compress worse [MX17].
- **On JKU-PDD itself, the numbers depend on who ran the code** [HHC+23 Table 2b]. Their Python SIA family:

  | algorithm | three-layer F |
  |---|---|
  | SIATEC | 0.12 |
  | COSIATEC | 0.10 |
  | SIATECCompress | 0.15 |
  | their own motif finder | 0.16 (F_est 0.34) |

  Meredith's own runs of the same family reach about 0.49 (topic 1, [Mer16], "Segment" mode).
- **What the algorithms agree on** [Ren20]:
  - They diverge from the annotators and from each other.
  - Rhythmic features explain most of the gap: many algorithms ignore meter.
  - Ren et al. recommend inspecting and choosing algorithms per application over a single ranking, and synthetic
    pieces with planted patterns.

**What we take.**
1. **JKU-PDD as the bench's pattern ground truth, fetched rather than committed.**
   - No licence is stated, and the kern comes from KernScores. So a script downloads the zip into a gitignored cache.
     Unlike `midi/`, which is committed, these files stay out of the repo.
   - A loader reads its csv: onset, MIDI pitch, duration, staff, a staff a track.
   - The readme discourages its MIDI files: they are shifted and end with an extra quiet note.
   - BWV 889 comes with it; it is a fugue that isn't in `midi/wtc` yet.
2. **The fold's patterns, in MIREX's format.**
   - A cell spliced twice or more is a pattern, and each place it plays is an occurrence: `engine/time/structure.ts`
     already gives each node's cell, output and time.
   - A copy (`base=`) is an inexact occurrence of its base, as JKU's are.
   - Occurrences are written as (onset in crotchets, MIDI pitch): MIREX's output format.
3. **The metrics, ported from mir_eval** (`mir_eval.pattern`, **MIT**) to TypeScript in `tools/disasm/`.
   - Port: establishment, occurrence (.75) and three-layer P/R/F.
   - The JKU zip has a test fixture for free: seven made-up outputs for the Mozart piece and the MATLAB scores in
     `matlab/results/results.txt`. Algorithm 1 is the ground truth itself, which must score 1.
4. **The scoring rule for the bench:** three-layer F and establishment F as the headline, occurrence F (.75) beside
   them, per piece, with the means over the 5. Those are the columns MIREX and [HHC+23] report.

**What we leave, and why.**
- **The audio versions:** synthesised from the same kern files. The audio layer is its own epic.
- **The monophonic versions:** they lay voices end to end, which is our voices step done by hand.
- **MTC-ANN, for now.** It is non-commercial share-alike and its tunes are monophonic, so it tests the folder's motifs
  but not voices. It is a later corpus, if folk tunes become a set.
- **BPS-Motif, for now.** Its repository has no licence, it is only first movements, and its motifs are short. It is
  the next pattern corpus if its licence is clarified, and the largest there is.
- **First-five measures and runtime.** We don't rank our patterns, and time is already a column.

**The nearest swamp.**
- **Tuning to five pieces.**
  - The development and test databases are 5 pieces each.
  - Implementation, "mode" (raw, segment or bounding box) and post-processing move the same algorithm family from
    0.10 to 0.49 on them.
  - A bench number is a reading, not a target. The gates stay fidelity and size; pattern F is reported and never
    tuned on.
- **Compression against annotations.**
  - [LM16] (topic 1) found shorter descriptions closer to the analysts; MIREX 2017 found compression and retrieval
    poorly correlated.
  - Both are true: annotators nest patterns (a motif inside a theme), and a cover that partitions the notes can't
    report both levels.
  - Our splice tree does nest. So report every level of the tree as patterns, not only the cover's top.

**The key question: can the bench run on it, and how do we score?** **Yes, with a loader and a writer.**
- The loader reads JKU's csv into notes.
- The writer turns the fold's splice tree into MIREX patterns.
- The score is a port of mir_eval's three metrics, checked against JKU's own `results.txt`.
- Nothing in the language or the folder changes.

**Our numbers against theirs.** None yet: the bench can't read JKU-PDD until the loader exists. Two partial
readings:
- The ratchet's *phrases back* (`fold/ratchet.slow.test.ts`: 62 of 191 over the examples) is an establishment recall
  at similarity 1, on our own examples rather than on annotations.
- The bench has no fugue in common with JKU-PDD: BWV 889 is not in `midi/wtc`.

**Next.**
- #383: *the bench reads JKU-PDD and scores the fold's patterns* (the loader, the writer, the metrics port with
  its fixture).
- Topic 3 (voice separation): below.

**References.**
- [HHC+23] Y.-W. Hsiao, T.-Y. Hung, T.-P. Chen, L. Su, "BPS-Motif: a dataset for repeated pattern discovery of
  polyphonic symbolic music", ISMIR 2023, 281–288 (CC BY 4.0). https://archives.ismir.net/ismir2023/paper/000032.pdf
  Data: github.com/Wiilly07/Beethoven_motif (no licence stated). Code: github.com/Tsung-Ping/motif_discovery.
- [JKU] T. Collins, JKU Patterns Development Database, August 2013.
  http://tomcollinsresearch.net/research/data/mirex/JKUPDD-noAudio-Aug2013.zip (downloaded and read: the readme,
  the ground truth folders, the MATLAB example results; no licence stated).
- [mir_eval] `mir_eval.pattern`, MIT. https://mir-eval.readthedocs.io/stable/api/pattern.html,
  github.com/mir-evaluation/mir_eval
- [MTC] The Meertens Tune Collections, CC BY-NC-SA 3.0. https://www.liederenbank.nl/mtc/
- [MX13] T. Collins, "2013: Discovery of Repeated Themes & Sections", MIREX wiki (task, data, metrics).
  https://music-ir.org/mirex/wiki/2013:Discovery_of_Repeated_Themes_%26_Sections. Results:
  https://music-ir.org/mirex/wiki/2013:Discovery_of_Repeated_Themes_%26_Sections_Results. 2014 and 2016 results:
  the same pages for those years, and their csv files (`/mirex/results/<year>/drts/symPolyResults<year>.csv`).
- [MX17] B. Janssen, I. Ren, T. Collins, A. Volk, "2017: Discovery of Repeated Themes & Sections Results", MIREX
  wiki. https://music-ir.org/mirex/wiki/2017:Discovery_of_Repeated_Themes_%26_Sections_Results
- [Ren20] I. Y. Ren, A. Volk, W. Swierstra, R. C. Veltkamp, "A computational evaluation of musical pattern discovery
  algorithms", arXiv:2010.12325.

## 3. Voice separation

**State of the art.**
- **What a voice is.**
  - Cambouropoulos [Cam08] separates the *voice* a score writes from the *stream* a listener hears. A stream may hold
    synchronous notes (a chord), and a voice in the narrow sense is monophonic.
  - Most methods and every benchmark below take monophonic voices.
  - Kilian & Hoos [KH02] allow chords in a voice (stochastic local search over slices, a cost for voice leading and
    for grouping). They show their results on typical problems, not with a benchmark number.
  - So does the piano engraving work of 2024 [FKN+24].
- **Rule-based and probabilistic methods:**
  - **Chew & Wu's contig mapping** [CW04] is what `fold/voices.ts` follows.
    - It cuts the piece into *contigs* where the number of sounding voices is constant, and connects voices across contig boundaries by the smallest pitch distance.
    - Its project sheet reports "90 % precision on Bach's pieces" [VoSA]. As de Valk et al. tabulate it, its *average
      voice consistency* is 84.39 % on 48 fugues of 3–5 voices [dVWB13, Table 5].
    - I could not read the paper itself (Springer, no open copy). Its method is read from these secondary sources and
      our own code's comment.
  - **Jordanous** [Jor08], a Markov model learned per note, scores note precision / recall 80.88 / 80.85 on 45
    fugues of 3–4 voices (as tabulated in [dVWB13]).
  - **Duane & Pardo** [DP09] cast it as constraint satisfaction plus sequence alignment. They define the metric that
    became standard: precision and recall over *links*, pairs of notes that are consecutive in one voice.
  - **McLeod & Steedman** [MS16] use an HMM over voice assignments with Huron's two principles (small pitch steps,
    short gaps), with an incremental, pruned search. It works on performed MIDI too. Code: Java, **MIT**.
- **Learned methods:**
  - **de Valk et al.** [dVWB13] use a neural network over note features, built for lute tablature and also tested on
    the first 10 fugues of WTC I: **soundness / completeness 94.07 / 93.42**.
  - **Gray & Bunescu** [GB20] rank voices per note or per chord, with a voice allowed to split and to merge:
    - 95.30 / 96.01 on the same 10 fugues;
    - 95.72 / 95.90 on 30 inventions and sinfonias plus 48 fugues.
  - **Karystinaios, Foscarin & Widmer** [KFW23] treat it as link prediction with a graph neural network.
    - They trained on 1,136 pieces: MCMA and KernScores (chorales, Haydn and Mozart quartets). Code: Python, **MIT**.
    - Link F1, with McLeod & Steedman's numbers as they report them:

    | set | McLeod & Steedman | graph network |
    |---|---|---|
    | Inventions | 0.992 | 0.997 |
    | Sinfonias | 0.982 | 0.985 |
    | WTC I fugues (12) | 0.964 | 0.976 |
    | WTC II fugues (12) | 0.964 | 0.972 |
    | Haydn quartets | 0.781 | 0.872 |

    - Before scoring they keep only the highest note where a voice sounds two at once, which removes 0.72 % of the
      notes (as McLeod did).
  - **Foscarin, Karystinaios et al.** [FKN+24] separate homophonic voices (chords allowed) and staves for piano:
    voice F1 96.6 on J-Pop, 89.9 on the DCML Romantic corpus. Code: **MIT**.
- **The metrics** [MS18 §2.2; dVWB13 §7]:
  - **Average voice consistency** (Chew & Wu): one note a voice scores 100 %.
  - **Note precision / recall** (Jordanous).
  - **Soundness / completeness** (Kirlin & Utgoff [KU05]): of the consecutive pairs in a voice found, the share in
    one voice written, and the other way round.
  - **Link P/R/F1** (Duane & Pardo): the same pairs, as a binary classification.
  - McLeod's MV2H [MS18] uses link F1 for its voice score, after removing notes the transcription missed.
  - The definitions aren't always used as written: de Valk et al. note that Madsen & Widmer's (2006) text and
    numbers disagree.

**The key question: are their numbers comparable to our 96 % / 93 %, and which metric?**
- **The metric is the same kind.** `voiceAgreement` (`tools/disasm/truth.ts`) is soundness and completeness: pairs of
  notes one after another in a voice found, and in a voice written. That is the link P/R the field reports. Keep it,
  and report F1 beside it.
- **The numbers are close but not yet strictly comparable.** Three things differ:
  - **The ground truth:** our voices are Mutopia's LilyPond voices (`tools/mutopia.py voice`). Theirs are KernScores'
    spines or MCMA's tracks.
  - **The pieces:** ours are those whose voices are clean, 29 of 3 voices or more. Theirs are all 12 fugues of a book,
    or 10.
  - **The preprocessing:** a chord in a written voice is kept in ours and cut to its top note in theirs. A unison
    counts once in ours, and is dropped as a duplicate in theirs.
- With that said, ours against theirs by set (`BENCH=… SET=<set> npx vitest run tools/disasm/bench.test.ts`, today):

  | set | ours P / R (files) | ours F | McLeod F | graph network F |
  |---|---|---|---|---|
  | Sinfonias | 97 / 96 (15) | ≈ 96.5 | 98.2 | 98.5 |
  | WTC fugues | 95 / 90 (13) | ≈ 92.4 | 96.4 | 97.2–97.6 |
  | Ricercar a 3 | 96 / 96 (1) | 96 | — | — |
  | all | 96 / 93 (29) | ≈ 94.5 | | |

  The first 10 fugues of WTC I, de Valk et al.: 94.07 / 93.42.
- **Reading:**
  - On the sinfonias we are within 2 points of the best published, with no training and three constants.
  - On the fugues our **recall** lags by about 6 points: we split a written voice where they keep it.
  - That is where to look: a voice crossing (our cost `CROSS` penalises it heavily), and an entry after a long rest. McLeod's
    gap probability handles the second.
  - Our constant `THICK` was tuned on these same 29 pieces. Theirs are trained or tuned elsewhere and tested
    held-out, so ours is a little flattered.

**What we take.**
1. **The metric's name and its F1:** soundness / completeness = link P/R, F1 beside them in the bench.
   - A strict mode with their preprocessing (a voice's top note where it holds a chord) makes the numbers directly
     comparable.
   - Where: `tools/disasm/truth.ts`, `bench.test.ts`.
2. **MCMA** [AKMN21] as the voice ground truth for comparison. It is **CC BY 4.0**, one track a voice.
   - It has the WTC (both books), the Inventions and Sinfonias, the Goldberg Variations, and **the Art of Fugue
     (21)**: the issue's corpus lead.
   - Its pieces are the ones [KFW23] tested on, so the same files give the same comparison.
   - Fetch it as `midi/<set>/voices/` (a set of its own, not shipped).
3. **McLeod & Steedman's HMM (MIT) as an offline reference.** Run it on the same files to separate "our method" from
   "our ground truth" in the gap. Not ported: it is a Java tool.
4. **Two ideas for `voices.ts`, each to be judged on the bench:**
   - a gap term, so a voice can rest and come back (McLeod's second principle);
   - a voice crossing that is allowed when both voices continue by step.

**What we leave, and why.**
- **The graph networks in the app.** They are trained models in Python on PyTorch, with a few points to gain on Bach,
  and we have a rule-based method within reach of them. They are a ceiling to cite, not a dependency.
- **Average voice consistency.** It is gameable: one note a voice scores 100 % [MS18].
- **Cambouropoulos' streams, for counterpoint.** A fugue's voices are the written lines. For homophonic music (pop,
  the examples' chords), though, a *stream with chords* is what our IR already is: a line of chords. So [KH02] and
  [FKN+24] are the leads when the bench gets non-contrapuntal pieces. Note it, don't build it.
- **Global optimisation** (Duane & Pardo's constraint satisfaction). It is exponential in voices and length; the
  literature moved to incremental search and to learned links.

**The nearest swamp.**
- **The metric zoo and its definitions.** Five metrics, papers that mislabel them, and preprocessing that drops
  notes. A number without its ground truth, its pieces and its preprocessing isn't comparable.
  - We have already been bitten once: `disassembler.md` first had voices making the fold 6.6 % longer, from a
    heuristic split.
  - So the bench pins all three: MCMA, the same files, the strict mode.
- **Chasing the last points on Bach.** The graph network's 97–99 % comes from training on 1,000 pieces. The size gain is bounded: the typesetters' voices fold 6.1 % shorter than hands (64 files), and the importer's own split already saves 2.6 % over the library. Measure what a point of recall buys in `bare` before chasing it.

**Next.**
- #384: *voices on the literature's terms* (MCMA as `voices/`, link F1 and a strict mode, McLeod's HMM run
  offline on the same files).
- Topic 4 (meter, beat and tempo): below.

**References.**
- [AKMN21] A. Aljanaki, S. Kalonaris, G. Micchi, E. Nichols, "MCMA: a symbolic multitrack contrapuntal music
  archive", Empirical Musicology Review 16(1):99–105, 2021. https://mcma.readthedocs.io/ (collections: WTC I 48,
  WTC II 48, Goldberg 31, Kunst der Fuge 21, Inventions 15, Sinfonias 15). Licence CC BY 4.0, per the release
  announcement: https://auditory.org/postings/2020/657.html
- [Cam08] E. Cambouropoulos, "Voice and stream: perceptual and computational modeling of voice separation", Music
  Perception 26(1):75–94, 2008. doi:10.1525/mp.2008.26.1.75 (abstract read)
- [CW04] E. Chew, X. Wu, "Separating voices in polyphonic music: a contig mapping approach", CMMR 2004, LNCS 3310,
  1–20. doi:10.1007/978-3-540-31807-1_1 (not read in full: no open copy)
- [DP09] B. Duane, B. Pardo, "Streaming from MIDI using constraint satisfaction optimization and sequence alignment",
  ICMC 2009 (its metric read as described in [MS18] §2.2)
- [dVWB13] R. de Valk, T. Weyde, E. Benetos, "A machine learning approach to voice separation in lute tablature",
  ISMIR 2013, 555–560. https://archives.ismir.net/ismir2013/paper/000221.pdf
- [FKN+24] F. Foscarin, E. Karystinaios, E. Nakamura, G. Widmer, "Cluster and separate: a GNN approach to voice and
  staff prediction for score engraving", arXiv:2407.21030. Code: github.com/CPJKU/piano_svsep (MIT).
- [GB20] P. Gray, R. Bunescu, "From note-level to chord-level neural network models for voice separation in
  symbolic music", arXiv:2011.03028.
- [Jor08] A. Jordanous, voice separation by a Markov model (2008). Its numbers were read as tabulated in [dVWB13].
- [KFW23] E. Karystinaios, F. Foscarin, G. Widmer, "Musical voice separation as link prediction: modeling a musical
  perception task as a multi-trajectory tracking problem", IJCAI 2023, 3866–3874. doi:10.24963/ijcai.2023/430,
  arXiv:2304.14848. Code: github.com/manoskary/vocsep_ijcai2023 (MIT).
- [KH02] J. Kilian, H. H. Hoos, "Voice separation: a local optimisation approach", ISMIR 2002.
  https://www.cs.ubc.ca/~hoos/Publ/KilHoo02.pdf
- [KU05] P. Kirlin, P. Utgoff, "VOISE: learning to segregate voices in explicit and implicit polyphony", ISMIR 2005, 552–557. Its metric was read as defined in [MS18] and [dVWB13].
- [MS16] A. McLeod, M. Steedman, "HMM-based voice separation of MIDI performance", JNMR 45(1):17–26, 2016.
  doi:10.1080/09298215.2015.1136650 (abstract read; the full text is behind a 403). Code:
  github.com/apmcleod/voice-splitting (MIT).
- [MS18] A. McLeod, M. Steedman, "Evaluating automatic polyphonic music transcription", ISMIR 2018, 42–49.
  https://ismir2018.ismir.net/doc/pdfs/148_Paper.pdf
- [VoSA] E. Chew, X. Wu, VoSA project sheet, USC IMSC. https://infolab.usc.edu/imsc/research/project/vosa/vosa_tech.pdf

## 4. Meter, beat and tempo

For #347: a file played in falls on no grid, so it needs a tempo map from its notes.

**Where we are.**
- The importer takes the coarsest grid every start falls on, within a 96th of a quarter (`midiimport.ts` `gridOf`).
  The file's own tempo map becomes the scan of the steps.
- Nothing infers a beat from the notes. The time view draws the meter from the tempo cell, which is known, not found.
- The 10 examples that lose notes in the MIDI path ([ratchet.md](ratchet.md)) don't lose them to rubato:
  - **two clocks at a ratio:** Phase (80:81), 888 starts moved;
  - **ratchets and tuplets:** IDM, Cellscape 2;
  - **a motor slowing down:** Musicbox;
  - **pitches that are no MIDI key:** DTMF, the Metronome.
- So #347 has two problems, and the literature mostly addresses only the first:
  - a *performed* single pulse (rubato, loose starts);
  - *several* pulses at once.

**State of the art.**
- **Symbolic meter, from durations and onsets:**
  - Longuet-Higgins & Lee [LHL82; LHL84] infer meter from note lengths, building and discarding hypotheses as the
    sequence unfolds. Monophonic, and tested on examples. Their rule: prefer the reading that isn't syncopated.
  - Desain & Honing [DH89] quantise with a connectionist network, also monophonic and without a benchmark number.
  - Temperley [Tem09] uses one probabilistic model for meter, harmony and stream.
  - **Inner metric analysis** (PRIMA [dHV16]) gets meter and first downbeat from onsets alone:
    - duple / triple right in 94–97 % of ragtime and pop MIDI files, against MIDI Toolbox's autocorrelation at 74–76 %;
    - the exact time signature in 80–94 %.
- **Rhythm quantisation of performances:**
  - Cemgil & Kappen [CK03] treat tempo as the hidden state of a switching state-space model and quantisation as MAP
    inference, by particle filter or MCMC. Abstract read; their test pieces are small.
  - Nakamura, Yoshii & Sagayama [NYS17] use a **merged-output HMM, a voice at a time**, so voices may be loosely
    synchronised or polyrhythmic. On classical piano MIDI it beats the other methods by more than 12 points of
    accuracy on polyrhythmic pieces, and roughly ties the best elsewhere. Code released.
- **Meter and alignment of performed MIDI:** McLeod & Steedman [MS18b] use an HMM with a lexicalised PCFG of
  rhythms and label bar, beat and sub-beat. Code: Java, **MIT**. Their metrical F (every grouping at three levels):

  | method | metronomic (48 WTC fugues, 15 inventions) | live (13 WTC files, CrestMusePEDB) |
  |---|---|---|
  | Temperley [Tem09] | 67.7 | 47.6 |
  | McLeod & Steedman | 78.7 | 39.6 |
  | McLeod & Steedman, all options | 80.5 | 56.5 |

- **Neural beat tracking of performance MIDI:**
  - **PM2S** [LKMB22] uses a CRNN that predicts which notes fall on beats, then dynamic programming for the beats
    between notes. It outputs beats, downbeats, time signature, key, note values and hands. Code: PyTorch, **MIT**.
    - Beat F 85.7–86.2, downbeat F 63.3–69.8 on its own test set.
    - On MV2H, metrical alignment 61.7 against Finale's 9.9 and MuseScore's 15.3.
  - **A transformer, MIDI to beat tokens** [MH25]. On ASAP, beat / downbeat F as that paper measures them:

    | method | beat F | downbeat F |
    |---|---|---|
    | PM2S | 82.95 | 14.14 |
    | the transformer | 78.13 | 27.81 |
    | Shibata et al.'s HMM | 43.6–47.7 | ≈ 13.5 |

    On A-MAPS (score MIDI with its tempo varied), the transformer reaches 98.0 / 76.6.
  - **The pattern:** beats from a performance are nearly solved (≈ 80–86 F). **Downbeats are not** (14–28 F on
    real performances).
- **Audio** (for the audio epic, not #347):
  - Ellis [Ell07] estimates a global tempo, then runs dynamic programming over an onset-strength envelope: the local
    match against a transition cost for a steady beat. "Just under 60 %" beat accuracy on the MIREX-06 data. It
    follows tempo changes of ±10 %.
  - madmom [BKS+16] has RNN beat and downbeat trackers with a DBN. Code **BSD**; its trained models are
    **CC BY-NC-SA 4.0**.
- **Data: ASAP** [FMK+20] has 222 scores aligned with 1,067 performances (MIDI, about 92 h; audio via MAESTRO).
  - It has beats, downbeats, time and key signatures, and note alignments (n)ASAP.
  - Bach among its 15 composers. **CC BY-NC-SA 4.0**.

**What we take.**
1. **ASAP as #347's measure**, fetched and not committed, because it is NC. It is exactly the issue's "played files
   with known scores", with beats annotated. It is also the set the MIDI beat trackers report on, so our number sits
   in their table.
2. **The metric:** beat F at ±70 ms (`mir_eval.beat`, **MIT**), with the ratchet's own beside it: notes kept, their
   timing, the folded size. Downbeat F is reported but not targeted.
3. **The method in the app: Ellis' dynamic programming, over the notes instead of audio.**
   - The onset strength is the time engine's `impulses` signal (`time/signals.ts`), and the global tempo is the
     scalogram's strongest ridge in the beat band (`time/wavelet.ts` `ridges`).
   - It is pure TS, about 100 lines, no model, and it fits `engine/`'s rules. The beats become the tempo map (#347's
     step 1), and notes land on a grid within it.
   - PM2S (MIT) is run offline on ASAP as the reference to beat. A gap of more than about 10 points of beat F would
     argue for a learned model later; it shouldn't be guessed now.
4. **For several pulses** (Phase, IDM, Cellscape 2): Nakamura's idea, *a voice at a time*.
   - Run the grid finder (and later the beat tracker) per line, not per file. Each line gets its own clock:
     `ratchet.md`'s "a meter per clock".
   - The language already says a line on its own clock. This is the case the literature's single-pulse trackers
     can't handle and our IR can.
5. **Meter for a file without a time signature:** PRIMA's idea (inner metric analysis folded into a bar profile) is
   cheap and accurate (94–97 % duple / triple). It is a later step: our files carry their time signatures.

**What we leave, and why.**
- **Learned beat trackers in the app.** PM2S and the transformer are PyTorch models. The gain over a DP tracker on
  *our* files is unmeasured. Measure first (above).
- **Particle filters and switching state-space models** [CK03]: heavy, and the HMM and neural lines superseded them
  on the benchmarks.
- **Longuet-Higgins & Lee, Desain & Honing, Temperley:** historical, monophonic, or outperformed (Table 1 of
  [MS18b]). Their *preference for the unsyncopated reading* is still the right tie-break for the grid finder.
- **madmom in the app:** its models are non-commercial, and it is the audio epic's question.

**The nearest swamp.**
- **Bars from a performance.** Downbeat F is 14–28 on ASAP even for the best MIDI trackers.
  - Take the beat from the notes and the bar from the file's time signature, or from the fold (a phrase's length).
  - Don't promise bars from a played file.
- **Quantising away the performance.**
  - A played file's timing is much of what it is. #347 already asks for a tolerance the user chooses, and velocities
    as levels.
  - Keep the residual (what moved, and by how much) rather than snapping silently. The literature's MV2H scores
    quantisation, not keeping.
- **One pulse for everything.** Every benchmark above assumes one beat per piece. Our own losses are two clocks at
  80:81 and tuplets. Measure the per-line grid on the examples before tuning a single-pulse tracker on ASAP.

**Our numbers against theirs.**
- None on played files: we have no beat tracker yet, and ASAP isn't in the bench.
- On score MIDI the grid finder moves few notes. Measured today with `cellsFromMidi`'s `moved`:
  - the MIDI library (WTC, Inventions, Anna Magdalena, Offering): **122 notes in 24 of the 88 files**, at most 26
    (anh117b's polonaise). Most likely ornaments and tuplets in LilyPond's MIDI; not checked note by note;
  - the examples: every note in 64 of the 74.
- The 10 examples that lose notes are multi-clock or off-key pitches, not rubato. That is the A-MAPS end of the table
  (score MIDI, tempo varied), where the transformer gets 98 % beat F. The open ground is ASAP's: real performances.

**Next.**
- #387: *a beat tracker from the notes, measured on ASAP*: Ellis' DP over `impulses`, the scalogram's tempo,
  PM2S offline as the reference, beat F and the ratchet's measures. A step of #347.
- #388: *a grid per line* (ratchet.md's meter per clock), measured on the 10 examples that lose notes and the
  24 library files that move some.
- Topic 5 (key and harmony): below.

**References.**
- [BKS+16] S. Böck, F. Korzeniowski, J. Schlüter, F. Krebs, G. Widmer, "madmom: a new Python audio and music signal
  processing library", ACM Multimedia 2016, 1174–1178. doi:10.1145/2964284.2973795, arXiv:1605.07008. Code:
  github.com/CPJKU/madmom (BSD; models CC BY-NC-SA 4.0).
- [CK03] A. T. Cemgil, B. Kappen, "Monte Carlo methods for tempo tracking and rhythm quantization", JAIR 18:45–81,
  2003. doi:10.1613/jair.1121, arXiv:1106.4863 (abstract read).
- [DH89] P. Desain, H. Honing, "The quantization of musical time: a connectionist approach", Computer Music Journal
  13(3):56–66, 1989. doi:10.2307/3680012 (record only: no open copy read).
- [dHV16] W. B. de Haas, A. Volk, "Meter detection in symbolic music using inner metric analysis", ISMIR 2016.
  https://archives.ismir.net/ismir2016/paper/000033.pdf
- [Ell07] D. P. W. Ellis, "Beat tracking by dynamic programming", JNMR 36(1):51–60, 2007.
  doi:10.1080/09298210701653344
- [FMK+20] F. Foscarin, A. McLeod, P. Rigaux, F. Jacquemard, M. Sakai, "ASAP: a dataset of aligned scores and
  performances for piano transcription", ISMIR 2020. https://zenodo.org/records/4245490 Data: github.com/CPJKU/asap-dataset (CC BY-NC-SA 4.0; read
  from its README).
- [LHL82] H. C. Longuet-Higgins, C. S. Lee, "The perception of musical rhythms", Perception 11(2):115–128, 1982.
  doi:10.1068/p110115 (abstract read)
- [LHL84] H. C. Longuet-Higgins, C. S. Lee, "The rhythmic interpretation of monophonic music", Music Perception
  1(4):424–441, 1984. doi:10.2307/40285271 (abstract read)
- [LKMB22] L. Liu, Q. Kong, V. Morfi, E. Benetos, "Performance MIDI-to-score conversion by neural beat tracking",
  ISMIR 2022. https://zenodo.org/records/7316682 Code: github.com/cheriell/PM2S (MIT).
- [MH25] S. Murgul, M. Heizmann, "Beat and downbeat tracking in performance MIDI using an end-to-end transformer
  architecture", arXiv:2507.00466.
- [MS18b] A. McLeod, M. Steedman, "Meter detection and alignment of MIDI performance", ISMIR 2018, 113–119.
  https://ismir2018.ismir.net/doc/pdfs/136_Paper.pdf Code: github.com/apmcleod/met-align (MIT).
- [NYS17] E. Nakamura, K. Yoshii, S. Sagayama, "Rhythm transcription of polyphonic piano music based on merged-output
  HMM for multiple voices", IEEE/ACM TASLP 25(4):794–806, 2017. arXiv:1701.08343 (abstract read)
- [Tem09] D. Temperley, "A unified probabilistic model for polyphonic music analysis", JNMR 38(1):3–18, 2009.
  doi:10.1080/09298210902928495 (its numbers read as [MS18b] reports them)

## 5. Key and harmony

**Where we are.**
- **One key for a piece:** `fold/degrees.ts` `bestKey` takes, of 36 keys (major, natural and harmonic minor on 12
  tonics), the one whose notes need the fewest accidentals. Ties go to the tonic the bass ends on.
- **Keys per section:** `fold/sections.ts` runs a Viterbi a bar at a time over 36 collections. A change of key costs 12
  accidentals, and an area lasts at least 2 bars.
- **Chords:** none as such. `figure.ts` finds a figure over a table of chords, but doesn't name them.

**State of the art.**
- **Key profiles:**
  - Krumhansl & Kessler [KK82] measured how well each pitch class fits a key, by listeners' ratings: the *probe-tone
    profiles*.
  - The **Krumhansl–Schmuckler** algorithm [Kru90] correlates a piece's duration-weighted pitch-class distribution
    with the 24 rotated profiles.
  - **Temperley** [Tem99] revised it in four ways: a simpler match, new profile values, pitch classes *present or
    absent* per short segment instead of summed durations, and a penalty for changing key between segments. Tested on
    the 48 WTC fugue subjects and the Kostka–Payne excerpts.
  - **Bayesian:** Temperley's MIREX 2005 model [Tem05] finds the most probable key *structure* (a key per segment,
    staying in key with probability 0.998). It got 1,127 of 1,252 excerpts right (91.4 % with partial credit).
  - **Trained on corpora:** Albrecht & Shanahan [AS13] use Euclidean distance instead of correlation, trained on 490
    kern pieces and tested on 492. They are better than the earlier models, especially on **minor-mode pieces, where
    most models are weaker**.
- **Geometry:** Chew's spiral array [Che00; Che02] puts pitches, chords and keys on one helix. Its *centre of effect*
  of the notes so far, nearest to a key, finds the key of the 24 WTC I fugue subjects sooner on average than the
  earlier methods (thesis abstract). It also finds key boundaries.
- **Chords:** Pardo & Birmingham [PB02] split chord labelling into segmenting the music and labelling the segments.
  Abstract only, via a review of the issue.
- **Functional harmony (Roman numerals) by neural networks** [NGF21], AugmentedNet. Accuracy on the held-out test
  sets, a frame at a time:

  | test set | key | full Roman numeral |
  |---|---|---|
  | all six datasets | 82.9 | 46.4–51.5 |
  | WTC I preludes | 77.2 | 46.2–47.9 |
  | BPS | 85.0 | 45.4 |

  Earlier models are lower (Chen & Su 2018–21; Micchi et al. 2020). Code on GitHub.
- **Data for harmony:** **When-in-Rome** [WiR] gathers Roman-numeral analyses in RomanText. Among them are **all 24
  preludes of WTC I** and the 371 chorales. New content is **CC BY-SA 4.0**; analyses from elsewhere keep their own
  licences.

**The key question: does our Viterbi over accidentals hold up against these on the 69 named keys?**
- **For the one key of a piece, yes.**
  - I ran music21's (**BSD-3**) implementations of the profile methods on the same 69 MIDI files: WTC 37, Inventions
    and Sinfonias 30, the two ricercars. Each profile method correlates duration-weighted pitch classes with its
    profiles.

    | method | right, of 69 |
    |---|---|
    | **ours** (`bestKey`) | **65** |
    | Krumhansl–Schmuckler | 64 |
    | Aarden–Essen | 64 |
    | Bellman–Budge | 62 |
    | Temperley–Kostka–Payne | 61 |
    | Sapp's simple weights | 65 |

  - **The errors are complementary.** Ours misses 4, and every profile method gets those 4 right:

    | piece | written | ours |
    |---|---|---|
    | Invention 2 | C minor | B♭ major |
    | Invention 9 | F minor | E♭ major |
    | Sinfonia 7 | E minor | D major |
    | WTC I/12 fugue | F minor | E♭ major |

    Each is **a minor piece read as the major a tone below its tonic**. That major is the tonic's Dorian: B♭ major holds C minor's ♭3 and ♭7 and the raised 6th of its melodic minor. Our key counts accidentals and nothing else, so a piece that uses the melodic minor going up and the natural minor going down reads best there. That is my reading of the four, not checked note by note.
  - The profile methods miss 14 other files that ours gets right. They give the relative major or minor (WTC I/11 prelude, F major → D minor by four of the five), or a key a fifth away.
  - A vote of the six gets **68 of 69**.
  - A simpler rule gets 68 as well: take Krumhansl–Schmuckler's key where it agrees with Aarden–Essen and differs
    from ours. That fixes our 4 and breaks one (WTC I/11 prelude).
  - 69 files are too few to choose between the two rules; the finding is that the methods' errors don't overlap.
- **For keys per section, not measured.** Our corpus names one key a piece and no local keys.
  - AugmentedNet's frame-wise key accuracy (77–89 %) is the comparable number.
  - When-in-Rome's WTC I preludes give local keys to measure `sections.ts` against.

**What we take.**
1. **A profile's tonic weighting as `bestKey`'s tie-break** instead of the last bass alone.
   - It goes where the accidentals are close: within a few accidentals of the best, take the key whose
     Krumhansl–Schmuckler correlation is highest.
   - That is the minor pieces' fix, measured above. The profiles are published numbers [KK82]; take them as music21
     has them.
   - Where: `fold/degrees.ts`. Judge it on the bench's keys (69) and the ratchets: a key changes the degrees, and so
     the fold.
2. **When-in-Rome's WTC I preludes as ground truth for local keys and chords.**
   - Local keys: `sections.ts` against the analysts' keys, a frame at a time, AugmentedNet's measure.
   - Chords: `figure.ts`'s chord tables against the Roman numerals' roots and qualities. BWV 847's prelude (I/2) is the example that already folds into a figure over chords. The other figuration preludes among the 24 (I/1 first) are the test.
   - CC BY-SA 4.0: fetch it, don't commit it (#365's rule for data with terms).
3. **Temperley's two revisions for `sections.ts`.**
   - *Pitch classes present per segment* rather than counted. Our accidentals are counted per note, so a long run of
     one chromatic note weighs heavily.
   - A *probabilistic* change cost instead of the fixed 12 (`SWITCH`), so its size has a meaning.
   - Both are judged on When-in-Rome's local keys before anything changes.

**What we leave, and why.**
- **AugmentedNet and the neural Roman-numeral models in the app.** They are trained models, at 46–52 % for a full
  Roman numeral, and the language has no Roman numerals. We need the key and the chord's notes, which the fold
  already has. They are a reference.
- **The spiral array as the key finder.** Its strength is speed (fewest notes to the key), which a whole-file
  importer doesn't need. Its *geometry* (keys, chords and pitches as one space) is topic 9's.
- **Chord labelling in its own right** [PB02]. The cells say chords as tables of notes; naming them is for display,
  not the fold.

**The nearest swamp.**
- **Functional harmony as a target.** Even the best model gets a full Roman numeral right about half the time, on
  analyses that differ between analysts. The fold needs *which notes are a chord, and which key reads them*, not
  their names.
- **Tuning on 69 files.** Every method here is between 61 and 65. Two more right is a vote's worth, so take the
  complementary signal, not a new constant.

**Our numbers against theirs.** Above:
- **Global key:** ours 65 / 69, the five profile methods 61–65 / 69, a vote 68 / 69, all on the same files.
- **Local keys and chords:** not yet measured.

**Next.**
- #389: *the key's tie-break by a profile, and When-in-Rome's WTC I preludes for local keys and chords*.
- Topic 6 (structure and form): below.

**References.**
- [AS13] J. Albrecht, D. Shanahan, "The use of large corpora to train a new type of key-finding algorithm", Music Perception 31(1):59–67, 2013. doi:10.1525/mp.2013.31.1.59 (abstract
  read)
- [Che00] E. Chew, *Towards a mathematical model of tonality*, PhD thesis, MIT, 2000.
  https://dspace.mit.edu/handle/1721.1/9139 (abstract as the repository record summarises it; the page itself was rate-limited)
- [Che02] E. Chew, "The spiral array: an algorithm for determining key boundaries", ICMAI 2002, LNCS 2445, 18–31.
  doi:10.1007/3-540-45722-4_4 (record only)
- [KK82] C. L. Krumhansl, E. J. Kessler, "Tracing the dynamic changes in perceived tonal organization in a spatial
  representation of musical keys", Psychological Review 89(4):334–368, 1982. doi:10.1037/0033-295X.89.4.334 (record;
  its profiles used as music21 implements them)
- [Kru90] C. L. Krumhansl, *Cognitive Foundations of Musical Pitch*, Oxford University Press, 1990 (2001 online).
  doi:10.1093/acprof:oso/9780195148367.001.0001 (record)
- [music21] `music21.analysis.discrete`: KrumhanslSchmuckler, AardenEssen, TemperleyKostkaPayne, BellmanBudge,
  SimpleWeights; music21 10.5.0, BSD-3-Clause. The run was a one-off script over `midi/` (not committed); its results are above.
- [NGF21] N. Nápoles López, M. Gotham, I. Fujinaga, "AugmentedNet: a Roman numeral analysis network with synthetic
  training examples and additional tonal tasks", ISMIR 2021.
  https://archives.ismir.net/ismir2021/paper/000050.pdf Code: github.com/napulen/AugmentedNet.
- [PB02] B. Pardo, W. P. Birmingham, "Algorithms for chordal analysis", Computer Music Journal 26(2):27–49, 2002.
  doi:10.1162/014892602760137167 (not read: no open copy; its scheme as a review of the issue describes it)
- [Tem05] D. Temperley, "A Bayesian key-finding model", MIREX 2005 abstract.
  https://music.informatics.indiana.edu/courses/I546/pdf/temperley.pdf
- [Tem99] D. Temperley, "What's key for key? The Krumhansl–Schmuckler key-finding algorithm reconsidered", Music
  Perception 17(1):65–100, 1999. doi:10.2307/40285812 (abstract read)
- [WiR] M. Gotham et al., When in Rome: Roman-numeral analyses in RomanText. github.com/MarkGotham/When-in-Rome (new
  content CC BY-SA 4.0; WTC I preludes 24, chorales 371; read from its README)

## 6. Structure and form

**Where we are.**
- **Sections by key:** `sections.ts`.
- **Boundaries heard in the scalograms:** `time/boundaries.ts`, with three finders:
  - cones (Mallat & Hwang);
  - novelty (Foote 2000);
  - swells.
- **The fold's splice tree** (`time/structure.ts`): which cell plays where, nested.
- **Two measures, both boundary precision / recall within a tolerance** of at least 1 s:
  - Swells against the examples' written sections find about 60 % at 56–72 % precision, chance 19 %
    ([scalogram.md](scalogram.md)).
  - The fold's phrases against the swells (`tools/disasm/heard.ts`): dances 52 / 30 (chance 27), counterpoint
    25 / 24 (chance 20) ([disassembler.md](disassembler.md)).

**State of the art.**
- **Audio structure analysis.** Paulus, Müller & Klapuri [PMK10] sort methods three ways:
  - **repetition** (the fold's kind: what comes back);
  - **novelty** (Foote's checkerboard kernel on a self-similarity matrix [Foo00]: what changes);
  - **homogeneity** (what stays alike: the swells are closest to it).

  "None of the approaches is clearly superior." Two people annotating the same pieces agree at **89.4 %** F, where a
  method reached **62.4 %**.
- **McFee & Ellis' spectral clustering** [ME14] reads repetition structure off the eigenvectors of a recurrence
  graph, and gives a hierarchy of segmentations, one per number of segment types. Boundary F at 0.5 s and at 3 s:

  | corpus | McFee & Ellis | with the best level per piece | Serrà et al. |
  |---|---|---|---|
  | Beatles (174) | 0.31 / 0.58 | 0.41 / 0.68 | 0.29 / 0.70 |
  | SALAMI (735) | 0.30 / 0.46 | 0.41 / 0.58 | — |

  Code: librosa.
- **Symbolic phrase boundaries** (melodies, Essen folk songs [PMW08]). Precision / recall / F1 against the phrase
  marks:

  | model | P | R | F1 |
  |---|---|---|---|
  | a logistic hybrid of the four below | 0.87 | 0.56 | 0.66 |
  | Temperley's Grouper | 0.71 | 0.62 | 0.66 |
  | Cambouropoulos' LBDM | 0.70 | 0.60 | 0.63 |
  | GTTM's GPR2a (a rest) | 0.99 | 0.45 | 0.58 |
  | IDyOM (unexpectedness) | 0.76 | 0.50 | 0.58 |
  | "always a boundary" | 0.13 | 1.00 | 0.22 |

  The journal version [PMW10] extends the comparison to listeners' boundaries.
- **GTTM implemented.** Hamanaka, Hirata & Tojo's ATTA [HHT05; HHT06] implements 26 of GTTM's 36 rules with adjustable parameters. Hand-tuned, it beats its default settings on 100 eight-bar melodies;
  its per-piece F-measures are in a figure we couldn't extract.
  - The **GTTM database** [HHT14] has 300 eight-bar monophonic classical pieces with grouping, metrical and time-span
    analyses (gttm.jp).
  - Two musicologists agreed on 267 of the 300. On the other 33, 233 of 2,310 time-spans differed.
- **Schenkerian reduction by learning.** Kirlin [KJ11; Kir15] represents an analysis as a maximal outerplanar graph
  and learns triangle probabilities from SCHENKER41 (41 excerpts, 907 triangles). The most probable analysis is found
  by dynamic programming.
  - Edge accuracy beats a random baseline (in a figure).
  - Three experts graded its analyses **half to a full letter grade below** the textbook's.
  - Marsden [Mar10] is the earlier proof of concept by search.

**What we take.**
1. **The literature's boundary metric, for comparison:** boundary F at 0.5 s and 3 s (`mir_eval.segment`, MIT), beside
   our tolerance-scaled score in `boundaries.ts` and `heard.ts`. Report both: ours scales with the phrase, theirs is
   what everyone else prints.
2. **Symbolic phrase boundaries as ground truth for the fold.**
   - Essen folk songs' phrase marks (music21 ships 31 ABC files of them; **non-commercial permission, legal status
     "unclear"**: offline only).
   - Score the fold's phrase starts (`time/structure.ts`) by boundary F1 against Grouper's 0.66, LBDM's 0.63, IDyOM's
     0.58 and "always"'s 0.22.
   - This asks what `heard.ts` asks, but against analysts instead of the sound. It is the symbolic counterpart of the
     counterpoint gap (25 / 24) that the swells leave.
3. **The GTTM database's grouping trees as ground truth for the splice tree's nesting:** 300 pieces, two analysts at
   267 / 300.
   - The fold is repetition-based and GTTM's grouping isn't. A large disagreement is a finding, not a bug.
   - The data's licence is not stated in the paper; check before fetching.
4. **The repetition / novelty / homogeneity frame** for `boundaries.ts`' docs. Our three finders map onto two of the
   three, and the fold is the third.

**What we leave, and why.**
- **Spectral clustering on audio** [ME14]. It is the audio epic's tool. On symbolic input, the fold's splice tree is a
  repetition hierarchy already, with exact rather than approximate repeats.
- **ATTA as an analyzer.** Dozens of hand-tuned parameters for GTTM's preference rules. GTTM's **well-formedness** is the useful part, already in the frame
  ([disassembler.md](disassembler.md), *Known swamps*).
- **Schenkerian reduction.** It is a reduction to the *Urlinie*, not a description of repetition. 41 excerpts of
  training data, graded a letter below a textbook. It is far from the fold's job.

**The nearest swamp.**
- **One true structure.** Annotators agree at 89 % on audio sections and 267 / 300 on GTTM trees. Hierarchies differ
  by level, and a method that picks its level per piece gains 10 points of F [ME14].
  - So score every level of the splice tree, and take the best match per piece as a reading, never as a target.
  - Report how far apart the analysts are, where a dataset has two.
- **GTTM in full** (confirmed). The preference rules interact, and the implementations spent a decade tuning them.
  Take well-formedness, and let description length prefer.

**Our numbers against theirs.**
- **Same kind of metric, different data.**
  - Our swells find the examples' written sections at about 60 % recall and 56–72 % precision with a tolerance of
    ≥ 1 s, close to F3-level tolerance. Audio methods reach F3 0.46–0.70 on SALAMI and the Beatles. Our examples'
    sections are cleaner than a song's, so this is not a win.
  - The fold's phrases against swells score F ≈ 0.38 in the dances and 0.24 in the counterpoint. That is not against
    annotations at all.
- The Essen and GTTM scores (*What we take*, 2–3) would put the fold in the literature's tables.

**Next.**
- #391: *the fold's structure against analysts* (Essen phrase boundaries offline, the GTTM database's grouping
  trees, boundary F at 0.5 / 3 s beside ours).
- Topic 7 (audio to notes) next session.

**References.**
- [Foo00] J. Foote, "Automatic audio segmentation using a measure of audio novelty", IEEE ICME 2000, 452–455.
  doi:10.1109/ICME.2000.869637 (record; the method as `boundaries.ts` and [PMK10] describe it)
- [HHT05] M. Hamanaka, K. Hirata, S. Tojo, "ATTA: automatic time-span tree analyzer based on extended GTTM", ISMIR
  2005. https://archives.ismir.net/ismir2005/paper/000015.pdf
- [HHT06] M. Hamanaka, K. Hirata, S. Tojo, "Implementing 'A Generative Theory of Tonal Music'", JNMR 35(4):249–277,
  2006. doi:10.1080/09298210701563238 (record only)
- [HHT14] M. Hamanaka, K. Hirata, S. Tojo, "Musical structural analysis database based on GTTM", ISMIR 2014 (CC BY 4.0).
  https://archives.ismir.net/ismir2014/paper/000257.pdf Data: http://www.gttm.jp/
- [Kir15] P. B. Kirlin, D. D. Jensen, "Learning to uncover deep musical structure", AAAI 2015.
  https://www.cs.rhodes.edu/~kirlinp/papers/kirlin15using.pdf
- [KJ11] P. B. Kirlin, D. D. Jensen, "Probabilistic modeling of hierarchical music analysis", ISMIR 2011, 393–398.
  https://archives.ismir.net/ismir2011/paper/000091.pdf
- [Mar10] A. Marsden, "Schenkerian analysis by computer: a proof of concept", JNMR 39(3):269–289, 2010.
  doi:10.1080/09298215.2010.503898 (record only)
- [ME14] B. McFee, D. P. W. Ellis, "Analyzing song structure with spectral clustering", ISMIR 2014.
  https://archives.ismir.net/ismir2014/paper/000319.pdf
- [PMK10] J. Paulus, M. Müller, A. Klapuri, "Audio-based music structure analysis" (state of the art report), ISMIR
  2010, 625–636.
  https://www.audiolabs-erlangen.com/content/05_fau/professor/00_mueller/03_publications/2010_PaulusMuellerKlapuri_STAR-MusicStructure_ISMIR.pdf
- [PMW08] M. T. Pearce, D. Müllensiefen, G. A. Wiggins, "A comparison of statistical and rule-based models of melodic
  segmentation", ISMIR 2008, 89–94. http://ismir2008.ismir.net/papers/ISMIR2008_228.pdf
- [PMW10] M. T. Pearce, D. Müllensiefen, G. A. Wiggins, "The role of expectation and probabilistic learning in auditory
  boundary perception: a model comparison", Perception 39(10):1367–1391, 2010. doi:10.1068/p6507
  (abstract read)

## 7. Audio → notes

Not yet.

## 8. Residual and analysis by synthesis

Not yet.

## 9. Higher-order and cross-scale relations

Not yet.
