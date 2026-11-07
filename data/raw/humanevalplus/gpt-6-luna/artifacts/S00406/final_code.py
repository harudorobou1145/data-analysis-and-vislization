
def is_palindrome(string: str) -> bool:
    """Test if given string is a palindrome."""
    return string == string[::-1]


def make_palindrome(string: str) -> str:
    """Find the shortest palindrome that begins with a supplied string.

    Append the reverse of the part before the string's longest palindromic
    suffix. This adds the fewest possible characters while preserving the
    original string as the prefix.

    >>> make_palindrome('')
    ''
    >>> make_palindrome('cat')
    'catac'
    >>> make_palindrome('cata')
    'catac'
    """
    chars = list(string)
    # The final prefix-function value is the longest prefix of the reversed
    # string that is also a suffix of the original string.
    sequence = chars[::-1] + [None] + chars
    prefix = [0] * len(sequence)
    for i in range(1, len(sequence)):
        matched = prefix[i - 1]
        while matched and sequence[i] != sequence[matched]:
            matched = prefix[matched - 1]
        if sequence[i] == sequence[matched]:
            matched += 1
        prefix[i] = matched

    palindromic_suffix_length = prefix[-1] if prefix else 0
    return string + string[:len(string) - palindromic_suffix_length][::-1]
