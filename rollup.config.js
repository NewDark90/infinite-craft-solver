import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const name = 'infinite-craft-solver';

/** @type {import('rollup').RollupOptions} */
const options = {
    input: 'src/index.ts',
    output: [{
        file: `dist/craft-db.tamper-script.js`,
        format: "umd",
        name: name,
        banner: `
// ==UserScript==
// @name         Craft Database
// @namespace    http://tampermonkey.net/
// @version      2024-02-13
// @description  Adds functionality to automatically find elements and combinations.
// @author       https://github.com/NewDark90
// @match        https://neal.fun/infinite-craft/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=neal.fun
// @grant        none
// ==/UserScript==
`
    }, {
        file: `dist/craft-db.umd.js`,
        format: "umd",
        name: name,
    }],
    plugins: [
        del({ targets: `dist/*` }),
        typescript(),
        nodeResolve(),
        commonjs(),
    ]
};

export default [
    options
];