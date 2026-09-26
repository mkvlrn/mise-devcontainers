# Custom completion function
function accept-or-complete() {
  if [[ -n "$POSTDISPLAY" ]]; then
    zle autosuggest-accept
  else
    zle expand-or-complete
  fi
}
zle -N accept-or-complete

# Bind Tab key to the custom completion function
bindkey '^I' accept-or-complete

# Enable case-insensitive completion
zstyle ':completion:*' matcher-list 'l:|=* r:|=*'
