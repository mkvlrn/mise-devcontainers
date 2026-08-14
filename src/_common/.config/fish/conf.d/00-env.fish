# paths
set -gx HOME_BIN "$HOME/.local/bin"
set -gx USR_LOCAL_BIN /usr/local/bin

# PATH
fish_add_path --prepend $HOME_BIN $USR_LOCAL_BIN
