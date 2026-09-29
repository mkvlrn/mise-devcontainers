#!/usr/bin/env bash
#MISE description="Verify the commit message"

mise exec -- cog verify --file "$1"
