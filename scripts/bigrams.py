import string

# All 2-letter alphabetic combinations, used as product-name substring search
# seeds. The Quest3+ server does not enforce the client-side 5-char minimum,
# so this gives near-complete coverage of the registry regardless of what
# any individual product is named (virtually every product name of
# reasonable length contains at least one common English bigram).
BIGRAMS = [a + b for a in string.ascii_lowercase for b in string.ascii_lowercase]
