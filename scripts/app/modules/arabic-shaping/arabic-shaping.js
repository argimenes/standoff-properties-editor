define(["speedy/arabic-shaping-data", "speedy/arabic-nonspacing-data"], function (arabicShapingData, arabicNonspacingData) {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Public functions

    /**
     * Returns true if the specific character is an Arabic character.
     *
     * @param char the character to be tested.
     * @returns {boolean}
     */
    function isArabicChar(char) {
        if (char === undefined || char === null || char === "") {
            return false;
        }

        const codePoint = char.codePointAt(0);

        return (codePoint >= 0x0600 && codePoint <= 0x06FF) ||
            (codePoint >= 0x0750 && codePoint <= 0x077F) ||
            (codePoint >= 0x08A0 && codePoint <= 0x08FF) ||
            (codePoint >= 0xFB50 && codePoint <= 0xFDFF) ||
            (codePoint >= 0xFE70 && codePoint <= 0xFEFF) ||
            (codePoint >= 0x10E60 && codePoint <= 0x10E7F) ||
            (codePoint >= 0x1EC70 && codePoint <= 0x1ECBF) ||
            (codePoint >= 0x1EE00 && codePoint <= 0x1EEFF)
    }

    /**
     * Returns true if the specified character is an Arabic diacritic.
     *
     * @param char the character to be tested.
     * @returns {boolean}
     */
    function isArabicDiacritic(char) {
        if (!isArabicChar(char)) {
            return false;
        } else {
            return arabicDiacritics.has(charToCodePointStr(char));
        }
    }

    /**
     * Given a character group C (i.e. a letter, possibly followed by one or more
     * diacritics), as well as the previous character group and the following
     * one, returns C with any necessary ZWJ added. If charGroup does not contain an
     * Arabic letter, it is returned unchanged.
     *
     * @param charGroup the character group that may need zero-width joining characters.
     * @param previousCharGroup the previous character group, or null if this is the beginning
     *        of the text.
     * @param nextCharGroup the next character group, or null if this is this is the end of the
     *        text.
     * @returns charGroup with any necessary zero-width joining characters added.
     */
    function addZwj(charGroup, previousCharGroup, nextCharGroup) {
        const char = removeDiacritics(charGroup);
        const previousChar = removeDiacritics(previousCharGroup);
        const nextChar = removeDiacritics(nextCharGroup);

        const zwjInstruction = getZwjInstruction(char, previousChar, nextChar);

        switch (zwjInstruction) {
            case ZwjInstructions.ZwjBefore:
                return ZWJ + charGroup;

            case ZwjInstructions.ZwjAfter:
                return charGroup + ZWJ;

            case ZwjInstructions.ZwjBoth:
                return ZWJ + charGroup + ZWJ;

            default:
                return charGroup;
        }
    }

    /**
     * Returns the next character group starting at the
     * specified position in a string. Each Arabic letter and its diacritics
     * become a group. Any other character becomes a group by itself.
     *
     * @param str the string.
     * @param startPos the position of the first character in
     *        the character group.
     * @returns {string}
     */
    function getNextCharGroup(str, startPos) {
        let charGroup = "";
        let pos = startPos;

        while (pos < str.length) {
            const char = String.fromCodePoint(str.codePointAt(pos));

            if (charGroup === "") {
                charGroup = char;
                pos += char.length;
            } else if (isArabicDiacritic(char)) {
                charGroup += char;
                pos += char.length;
            } else {
                break;
            }
        }

        return charGroup;
    }

    /**
     * Splits a string into an array of character groups and adds ZWJ
     * to each group as needed. Each Arabic letter and its diacritics
     * become a group. Any other character becomes a group by itself.
     *
     * @param str the string to be transformed.
     */
    function makeCharGroupsWithZwj(str) {
        const charGroups = [];
        let pos = 0;

        while (pos < str.length) {
            const charGroup = getNextCharGroup(str, pos);
            charGroups.push(charGroup);
            pos += charGroup.length;
        }

        return charGroups.map(
            function (charGroup, index) {
                let previousCharGroup = null;
                let nextCharGroup = null;

                if (index > 0) {
                    previousCharGroup = charGroups[index - 1];
                }

                if (index < charGroups.length - 1) {
                    nextCharGroup = charGroups[index + 1];
                }

                return addZwj(charGroup, previousCharGroup, nextCharGroup);
            }
        );
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Private functions

    const ZWJ = "&zwj;";

    function removeDiacritics(str) {
        if (str === undefined || str === null || str === "") {
            return str;
        }

        let result = "";
        let pos = 0;

        while (pos < str.length) {
            const char = String.fromCodePoint(str.codePointAt(pos));

            if (!isArabicDiacritic(char)) {
                result += char;
            }

            pos += char.length;
        }

        return result;
    }

    const ZwjInstructions = {
        ZwjBefore: "Zwj_Before",
        ZwjAfter: "Zwj_After",
        ZwjBoth: "Zwj_Both",
        ZwjNone: "Zwj_None",
    };

    Object.freeze(ZwjInstructions);

    function getZwjInstruction(char, previousChar, nextChar) {
        const charJoiningProperty = getJoiningProperty(char);
        const previousCharJoiningProperty = getJoiningProperty(previousChar);
        const nextCharJoiningProperty = getJoiningProperty(nextChar);

        const needsZwJBefore = joinsLeft(previousCharJoiningProperty) && joinsRight(charJoiningProperty);
        const needsZwJAfter = joinsLeft(charJoiningProperty) && joinsRight(nextCharJoiningProperty);

        if (needsZwJBefore && needsZwJAfter) {
            return ZwjInstructions.ZwjBoth;
        } else if (needsZwJBefore) {
            return ZwjInstructions.ZwjBefore;
        } else if (needsZwJAfter) {
            return ZwjInstructions.ZwjAfter;
        } else {
            return ZwjInstructions.ZwjNone;
        }
    }

    function charToCodePointStr(char) {
        return char.codePointAt(0).toString(16).toUpperCase();
    }

    const JoiningProperties = {
        RightJoining: "R",
        LeftJoining: "L",
        DualJoining: "D",
        JoinCausing: "C",
        NonJoining: "U",
        Transparent: "T"
    };

    Object.freeze(JoiningProperties);

    function getJoiningProperty(char) {
        if (!isArabicChar(char)) {
            return JoiningProperties.NonJoining;
        } else {
            const codePointStr = charToCodePointStr(char);

            if (arabicDiacritics.has(codePointStr)) {
                return JoiningProperties.Transparent;
            } else {
                const char_shaping_data = arabicShapingData[codePointStr];

                if (char_shaping_data === undefined) {
                    return JoiningProperties.NonJoining;
                } else {
                    return char_shaping_data;
                }
            }
        }
    }

    function joinsLeft(joiningProperty) {
        return joiningProperty === JoiningProperties.LeftJoining || joiningProperty === JoiningProperties.DualJoining;
    }

    function joinsRight(joiningProperty) {
        return joiningProperty === JoiningProperties.RightJoining || joiningProperty === JoiningProperties.DualJoining;
    }

    // A set of all Arabic non-spacing marks.
    const arabicDiacritics = new Set(arabicNonspacingData["diacritics"]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Construct module object

    return {
        isArabicChar: isArabicChar,
        isArabicDiacritic: isArabicDiacritic,
        addZwj: addZwj,
        getNextCharGroup: getNextCharGroup,
        makeCharGroupsWithZwj: makeCharGroupsWithZwj
    };
});
