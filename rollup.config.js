import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';
import { nodeResolve } from '@rollup/plugin-node-resolve';

/** @type {import('rollup').RollupOptions} */
const clientOptions = {
    input: 'src/main.ts',
    output: {
        file: `dist/tamper-scripts.js`,
        format: "umd",
        name: "tamperScripts"
    },
    plugins: [
        del({ targets: `dist/*` }),
        typescript(),
        nodeResolve(),
        commonjs(),
    ]
};

export default clientOptions;