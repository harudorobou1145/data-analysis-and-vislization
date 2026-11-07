def is_nested(string):
    '''Return whether the input contains a nested bracket subsequence.

    For inputs containing only square brackets, this is equivalent to
    finding two opening brackets followed by two closing brackets.
    '''
    matched = 0
    for bracket in string:
        is_opening = bracket == '['
        if is_opening == (matched < 2):
            matched += 1
            if matched == 4:
                return True
    return False
