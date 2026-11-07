
def is_nested(string):
    '''
    Create a function that takes a string as input which contains only square brackets.
    The function should return True if and only if there is a valid subsequence of brackets 
    where at least one bracket in the subsequence is nested.

    is_nested('[[]]') ➞ True
    is_nested('[]]]]]]][[[[[]') ➞ False
    is_nested('[][]') ➞ False
    is_nested('[]') ➞ False
    is_nested('[[][]]') ➞ True
    is_nested('[[]][[') ➞ True
    '''
    # A nested valid subsequence needs at least two opening brackets followed
    # later by at least two closing brackets (the subsequence may skip others).
    openings = 0
    closings_after_two_openings = 0

    for bracket in string:
        if bracket == '[':
            openings += 1
        elif openings >= 2:
            closings_after_two_openings += 1
            if closings_after_two_openings >= 2:
                return True

    return False
