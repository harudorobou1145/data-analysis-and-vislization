
def how_many_times(string: str, substring: str) -> int:
    """Find how many times a substring occurs in a string, counting overlaps.

    >>> how_many_times('', 'a')
    0
    >>> how_many_times('aaa', 'a')
    3
    >>> how_many_times('aaaa', 'aa')
    3
    """
    if substring == "":
        # The empty string occurs at each boundary between characters.
        return len(string) + 1

    count = 0
    start = 0
    while True:
        index = string.find(substring, start)
        if index == -1:
            return count
        count += 1
        # Advance one position so matches that overlap are included.
        start = index + 1
