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
    # Each open pair records whether it contains a completed child pair.
    opening = []
    for bracket in string:
        if bracket == '[':
            opening.append(False)
        elif bracket == ']' and opening:
            contains_pair = opening.pop()
            if contains_pair:
                return True
            if opening:
                opening[-1] = True
    return False
