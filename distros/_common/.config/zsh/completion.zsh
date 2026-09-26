# fzf-tab must own Tab. Binding it to expand-or-complete bypasses fzf-tab's
# filtering widget entirely.
bindkey '^I' fzf-tab-complete

# Let fzf-tab filter completion candidates like fish does. The first matcher
# keeps completion case-insensitive; the later matchers allow candidates that
# contain the typed text instead of only matching its beginning.
zstyle ':completion:*' matcher-list \
  'm:{a-z}={A-Z}' \
  'r:|[._-]=* r:|=*' \
  'l:|=*'

# If the typed text is not a prefix/substring, ask Zsh's approximate
# completer to produce candidates so fzf-tab can fuzzy-filter them.
zstyle ':completion:*' completer _complete _approximate
zstyle ':completion:*:approximate:*' max-errors 7

# Let fzf-tab capture and filter the complete candidate list. Keep the text
# already typed as fzf's query; otherwise approximate completion can open with
# an unfiltered list.
zstyle ':completion:*' menu no
zstyle ':fzf-tab:*' query-string input
