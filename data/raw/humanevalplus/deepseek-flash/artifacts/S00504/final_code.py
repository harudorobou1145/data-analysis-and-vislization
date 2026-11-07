
def how_many_times(string: str, substring: str) -> int:
    """ Find how many times a given substring can be found in the original string. Count overlaping cases.
    >>> how_many_times('', 'a')
    0
    >>> how_many_times('aaa', 'a')
    3
    >>> how_many_times('aaaa', 'aa')
    3
    """
    if not substring or len(substring) > len(string):
        return 0

    count = 0
    last_start = len(string) - len(substring)
    for start in range(last_start + 1):
        if string.startswith(substring, start):
            count += 1
    return count
