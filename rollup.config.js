import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';
import { nodeResolve } from '@rollup/plugin-node-resolve';

/** @type {import('rollup').RollupOptions} */
const clientOptions = {
    input: 'src/main.ts',
    output: {
        file: `dist/craft-db.js`,
        format: "umd",
        name: "tamperScripts",
        banner: `
// ==UserScript==
// @name         Craft Database
// @namespace    http://tampermonkey.net/
// @version      2024-02-13
// @description  try to take over the world!
// @author       You
// @match        https://neal.fun/infinite-craft/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neal.fun
// @grant        none
// ==/UserScript==
`
    },
    plugins: [
        del({ targets: `dist/*` }),
        typescript(),
        nodeResolve(),
        commonjs(),
    ]
};

export default clientOptions;