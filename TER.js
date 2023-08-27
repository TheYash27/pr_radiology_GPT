const fs = require('fs');
const natural = require('natural');

function ter(referenceTokens, hypothesisTokens) {
    const referenceSet = new Set(referenceTokens);
    const hypothesisSet = new Set(hypothesisTokens);

    const union = new Set([...referenceSet, ...hypothesisSet]);
    const intersection = new Set([...referenceSet].filter(token => hypothesisSet.has(token)));

    const insertion = hypothesisSet.size - intersection.size;
    const deletion = referenceSet.size - intersection.size;
    const substitution = referenceTokens.length + hypothesisTokens.length - 2 * intersection.size;
    const shift = Math.abs(referenceTokens.length - hypothesisTokens.length) - substitution;

    return (insertion + deletion + substitution + shift) / referenceTokens.length;
}

function main() {
    const referenceFile = './Expert.txt';  // Path to the reference text file
    const hypothesisFile = './Generated.txt';  // Path to the hypothesis (machine-generated) text file

    const referenceSentences = fs.readFileSync(referenceFile, 'utf-8').split('\n');
    const hypothesisSentences = fs.readFileSync(hypothesisFile, 'utf-8').split('\n');

    let totalTerScore = 0;
    const numSentences = referenceSentences.length;

    for (let i = 0; i < numSentences; i++) {
        const refSentence = referenceSentences[i].trim();
        const hypSentence = hypothesisSentences[i].trim();

        const refTokens = natural.WordTokenizer(refSentence);
        const hypTokens = natural.WordTokenizer(hypSentence);

        const terScore = ter(refTokens, hypTokens);
        totalTerScore += terScore;
    }

    const averageTerScore = totalTerScore / numSentences;
    console.log('Average TER score:', averageTerScore);
}

main();
