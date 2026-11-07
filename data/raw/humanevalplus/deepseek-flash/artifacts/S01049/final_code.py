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
    nested_opening = string.find('[[')
    if nested_opening == -1:
        return False

    # The nested bracket pair must also be closed before it can form part of
    # a valid bracket sequence.
    return string.find(']]', nested_opening + 2) != -1
