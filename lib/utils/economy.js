module.exports = {
    parseAmount(amount) {
        const pattern = /(-?[0-9]+)([kK]|[mM])?/;

        if (!pattern.test(amount)) {
            throw new Error('Invalid string provided.');
        }

        match = amount.match(pattern);
        let [_, base, multiplier] = match;
        const result = this.multiply(base, multiplier);

        return parseFloat(result);
    },
    /**
     * Multiply a number by a literal quantifier
     * @param {number} base The base number
     * @param {string} multiplier The multiplier in literal form (e.g. `k`, `m`, ...)
     */
    multiply(base, multiplier) {
        if (!multiplier) return base;

        switch (multiplier.toLowerCase()) {
            case 'k':
                base *= 1e+03;
                break;

            case 'm':
                base *= 1e+06;
                break;

            default:
                throw new Error('Invalid multiplier provided.');
        }

        return base;
    }
}