import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/main.js',
        format: 'iife',
        name: 'AITableTool',
        sourcemap: true
    },
    plugins: [
        typescript({
            tsconfig: 'tsconfig.json',
            compilerOptions: {
                target: 'ES2020',
                module: 'ESNext'
            }
        })
    ],
    external: ['jQuery']
};
