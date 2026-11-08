### Changed
- **The MIDI page takes the window's whole width, and an output's device settings open in a dialog** from the output's head in the matrix or its button under it (a sheet from the bottom on a phone), where they sat under the matrix in a 380 px pane that scrolled them out of view. An output's × in the matrix removes it after asking, and the last output removed is left with *No device*, its routing kept. Saved `.cells` pieces are not affected.

### Added
- **What went wrong with MIDI is said**, listed on the MIDI page until dismissed: a port that threw when sent to, a message a listener couldn't play, a test note with no port, ports or inputs that couldn't be read, and a request for MIDI the browser hasn't answered after 8 s (Connect can then be pressed again). The MIDI page, and every page of the sidebar, stops alone when it throws, showing the error with *Try again* (and *Reset MIDI settings*), instead of leaving the app silently unresponsive.
- **Reset MIDI settings…** forgets every setup and device profile, after asking; **a device's own settings can be forgotten** from its dialog.
