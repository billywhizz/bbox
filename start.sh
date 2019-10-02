#!/bin/bash
export DISPLAY=:0
xset s noblank
xset s off
xset -dpms
unclutter -idle 0.5 &
rm -fr Default && node index.js
